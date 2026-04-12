import { ChatInputCommand } from '@/types'
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import process from 'node:process'
import { PERMISSION_ERROR_TEXT } from '@/data'
import { db } from '@/db'
import { applications } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { int } from 'drizzle-orm/mysql-core'
import { channel } from 'diagnostics_channel'
import { createDefaultEmbed } from '@/utils'

export const approveCommand: ChatInputCommand = {
	data: new SlashCommandBuilder()
		.setName('approve')
		.setDescription('Approve application.')
		.addStringOption((option) =>
			option.setName('id').setDescription('Application ID').setRequired(true),
		) as SlashCommandBuilder,
	meta: {
		name: 'approve',
		description: 'Approve application.',
		category: 'moderation',
		cooldownSeconds: 3,
	},
	async execute(interaction: ChatInputCommandInteraction) {
		if (!interaction.guild) return

		const applicationId = interaction.options.getString('id')

		const invoker = await interaction.guild.members.fetch(interaction.user.id)

		if (!invoker.roles.cache.has(process.env.DISCORD_MODERATOR_ROLE_ID!)) {
			await interaction.reply({
				content: PERMISSION_ERROR_TEXT,
				flags: 'Ephemeral',
			})
			return
		}

		const [linkedCase] = await db
			.select()
			.from(applications)
			.where(eq(applications.applicationId, applicationId!))

		if (!linkedCase) {
			await interaction.reply({
				content: 'This application does not exist, have you typed it correctly?',
				flags: 'Ephemeral',
			})
			return
		}

		if (!linkedCase.reviewedBy) {
			await interaction.reply({
				content: 'Before taking actions on applications you have to assign yourself to them first.',
				flags: 'Ephemeral',
			})
			return
		}

		if (linkedCase.reviewedBy && linkedCase.reviewedBy != invoker.id) {
			await interaction.reply({
				content: `This application is currently being reviewed by <@${linkedCase.reviewedBy}>, you can't modify applications you've not been assigned to.`,
				flags: 'Ephemeral',
			})
			return
		}
		if (linkedCase.status != 'pending') {
			await interaction.reply({
				content: 'This application has already been reviewed.',
				flags: 'Ephemeral',
			})
			return
		}

		const [updated] = await db
			.update(applications)
			.set({
				status: 'approved',
				reviewedBy: invoker.id,
				reviewedAt: new Date(),
			})
			.where(eq(applications.applicationId, applicationId!))
			.returning()

		const modChannel = await interaction.guild.channels.fetch(process.env.MOD_CHANNEL_ID!)

		if (modChannel && modChannel.isTextBased()) {
			const linkedApplicationEmbed = await modChannel.messages.fetch(updated.linkedMessageId!)

			const embed = EmbedBuilder.from(linkedApplicationEmbed.embeds[0])
				.setTitle('Trusted Role Application - Approved')
				.setDescription(`**Application has been reviewed by <@${updated.reviewedBy}>**`)
				.setFields([
					{ name: 'User', value: `<@${updated.userId}>`, inline: true },
					{ name: 'User ID', value: updated.userId, inline: true },
					{ name: 'Application ID', value: updated.applicationId },
					{ name: 'Application Status', value: updated.status },
				])
				.setColor(0x1bd96a)

			await linkedApplicationEmbed.edit({
				embeds: [embed],
			})
		}

		const approvedUser = await interaction.guild.members.fetch(updated.userId)

		await approvedUser.roles.add(process.env.TRUSTED_ROLE_ID!)

		await approvedUser.send({
			embeds: [
				createDefaultEmbed({
					title: 'Trusted Role Application - Approved',
					description: [
						'Your application has been approved, thank you for being an active community member!',
						' ',
						'You are now permitted to upload images and share links in our community.',
						' ',
						'Please use this privilege responsibly, abuse will result in permanent role removal.',
					].join('\n'),
				}),
			],
		})

		await interaction.reply({
			content: [
				'Application has been updated:',
				' ',
				`\`\`\`json\n${JSON.stringify(updated, null, 2)}\`\`\``,
			].join('\n'),
			flags: 'Ephemeral',
		})
	},
}
