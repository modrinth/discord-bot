import { ChatInputCommand } from '@/types'
import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from 'discord.js'
import process from 'node:process'
import { PERMISSION_ERROR_TEXT } from '@/data'
import { db } from '@/db'
import { applications } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { createDefaultEmbed } from '@/utils'
import { info } from '@/logging/logger'

export const rejectCommand: ChatInputCommand = {
	data: new SlashCommandBuilder()
		.setName('reject')
		.setDescription('Reject application')
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.addStringOption((option) =>
			option.setName('id').setDescription('Application ID').setRequired(true),
		)
		.addStringOption((option) =>
			option.setName('reason').setDescription('Rejection reason').setRequired(true),
		) as SlashCommandBuilder,
	meta: {
		name: 'reject',
		description: 'Reject application',
		category: 'moderation',
		cooldownSeconds: 3,
	},
	async execute(interaction: ChatInputCommandInteraction) {
		if (!interaction.guild) return

		const applicationId = interaction.options.getString('id')
		const rejectionReason = interaction.options.getString('reason')

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

		const cooldown = new Date()
		cooldown.setDate(cooldown.getDate() + 7)

		const [updated] = await db
			.update(applications)
			.set({
				status: 'rejected',
				reviewedBy: invoker.id,
				reviewedAt: new Date(),
				rejectionReason: rejectionReason,
				cooldownUntil: cooldown,
			})
			.where(eq(applications.applicationId, applicationId!))
			.returning()

		const applicationsChannel = await interaction.guild.channels.fetch(
			process.env.APPLICATIONS_CHANNEL_ID!,
		)

		if (applicationsChannel && applicationsChannel.isTextBased()) {
			const linkedApplicationEmbed = await applicationsChannel.messages.fetch(
				updated.linkedMessageId!,
			)

			const embed = EmbedBuilder.from(linkedApplicationEmbed.embeds[0])
				.setTitle('Trusted Role Application - Rejected')
				.setDescription(
					[
						`**Application has been reviewed by <@${updated.reviewedBy}>**`,
						`Rejection reason: ${rejectionReason}`,
						`User is blocked from submitting new application until <t:${Math.floor(cooldown.getTime() / 1000)}:F> (7-day penalty).`,
					].join('\n'),
				)
				.setFields([
					{ name: 'User', value: `<@${updated.userId}>`, inline: true },
					{ name: 'User ID', value: updated.userId, inline: true },
					{ name: 'Application ID', value: updated.applicationId },
					{ name: 'Application Status', value: updated.status },
				])
				.setColor(0xff496e)

			await linkedApplicationEmbed.edit({
				embeds: [embed],
			})
		}

		const rejectedUser = await interaction.guild.members.fetch(updated.userId)

		await rejectedUser.send({
			embeds: [
				createDefaultEmbed({
					title: 'Trusted Role Application - Rejected',
					description: [
						'Your application has been rejected, please try again later.',
						' ',
						rejectionReason,
					].join('\n'),
				}).setColor(0xff496e),
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

		info(
			`:x: Trusted user application for <@${rejectedUser.user.id}> (\`${rejectedUser.user.username}\`, ID: ${rejectedUser.user.id}) has been rejected by a moderator <@${interaction.user.id}> (\`${interaction.user.username}\`, ID: ${interaction.user.id}) with a reason:\n\`\`\`${rejectionReason}\`\`\``,
		)
	},
}
