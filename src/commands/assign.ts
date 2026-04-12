import { ChatInputCommand } from '@/types'
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import process from 'node:process'
import { PERMISSION_ERROR_TEXT } from '@/data'
import { db } from '@/db'
import { applications } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { int } from 'drizzle-orm/mysql-core'
import { channel } from 'diagnostics_channel'

export const assignCommand: ChatInputCommand = {
	data: new SlashCommandBuilder()
		.setName('assign')
		.setDescription('Assign case to a moderator.')
		.addStringOption((option) =>
			option.setName('id').setDescription('Application ID').setRequired(true),
		)
		.addUserOption((option) =>
			option.setName('moderator').setDescription('Discord Moderator').setRequired(true),
		) as SlashCommandBuilder,
	meta: {
		name: 'assign',
		description: 'Assign case to a moderator.',
		category: 'moderation',
		cooldownSeconds: 3,
	},
	async execute(interaction: ChatInputCommandInteraction) {
		if (!interaction.guild) return

		const applicationId = interaction.options.getString('id')
		const discordModerator = interaction.options.getUser('moderator')

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

		if (linkedCase.reviewedBy) {
			await interaction.reply({
				content: `This application is already assigned to <@${linkedCase.reviewedBy}>.`,
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
				reviewedBy: discordModerator!.id,
			})
			.where(eq(applications.applicationId, applicationId!))
			.returning()

		const modChannel = await interaction.guild.channels.fetch(process.env.MOD_CHANNEL_ID!)

		if (modChannel && modChannel.isTextBased()) {
			const linkedApplicationEmbed = await modChannel.messages.fetch(updated.linkedMessageId!)

			const embed = EmbedBuilder.from(linkedApplicationEmbed.embeds[0])

			await linkedApplicationEmbed.edit({
				embeds: [
					embed.setDescription(`**Application is being reviewed by <@${updated.reviewedBy}>**`),
				],
			})
		}

		await interaction.reply({
			content: `Successfully assigned moderator <@${updated.reviewedBy}> to application.`,
			flags: 'Ephemeral',
		})
	},
}
