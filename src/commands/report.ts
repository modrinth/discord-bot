import { SlashCommandBuilder, GuildMemberRoleManager } from 'discord.js'

import type { ChatInputCommand } from '@/types/commands'
import process from 'node:process'
import { PERMISSION_ERROR_TEXT } from '@/data'

export const reportCommand: ChatInputCommand = {
	data: new SlashCommandBuilder()
		.setName('report')
		.setDescription('Report a community member')
		.addUserOption((option) =>
			option.setName('user').setDescription('The user to report').setRequired(true),
		) as SlashCommandBuilder,
	meta: {
		name: 'report',
		description: 'Report a community member',
		category: 'general',
		cooldownSeconds: 2,
	},
	async execute(interaction) {
		const user = interaction.options.getUser('user', true)

		if (!interaction.guild || !interaction.member) return
		if (
			!(interaction.member.roles as GuildMemberRoleManager).cache.has(process.env.ACTIVE_ROLE_ID!)
		) {
			await interaction.reply({
				content: PERMISSION_ERROR_TEXT,
				flags: 'Ephemeral',
			})
			return
		}
		if (user.bot) {
			await interaction.reply({
				content: "You can't report bots.",
				flags: 'Ephemeral',
			})
			return
		}
		const member = await interaction.guild.members.fetch(user.id)
		if (!member) return

		await interaction.reply({
			content: `${member} (\`${member.user.username}\`, ID: ${member.id}) was reported.`,
			flags: 'Ephemeral',
		})

		// await handleReport({
		// 	reportedUserId: user.id,
		// 	reporterUserId: interaction.user.id,
		// 	reason: 'manual report',
		// 	source: 'user',
		// 	member: member,
		// })
	},
}
