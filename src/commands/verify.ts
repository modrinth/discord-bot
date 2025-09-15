import { SlashCommandBuilder } from 'discord.js'

import type { ChatInputCommand } from '@/types/commands'
import { createVerificationState } from '@/web'

export const verifyCommand: ChatInputCommand = {
	data: new SlashCommandBuilder()
		.setName('verify')
		.setDescription('Link your external account to your Discord user')
		.addSubcommand((sub) => sub.setName('crowdin').setDescription('Link your Crowdin account'))
		.addSubcommand((sub) =>
			sub.setName('modrinth').setDescription('Link your Modrinth account'),
		) as SlashCommandBuilder,
	meta: {
		name: 'verify',
		description: 'Link your Crowdin or Modrinth account with your Discord user',
		category: 'utility',
		guildOnly: true,
	},
	execute: async (interaction) => {
		const sub = interaction.options.getSubcommand()
		const base = process.env.PUBLIC_BASE_URL || 'http://localhost:3000'
		if (sub === 'crowdin') {
			const token = await createVerificationState(interaction.user.id)
			const url = `${base}/crowdin/verify?token=${encodeURIComponent(token)}`
			await interaction.reply({
				content: `To link your Crowdin account, open: ${url}\nThis link expires in 15 minutes.`,
				ephemeral: true,
			})
			return
		}
		if (sub === 'modrinth') {
			// const token = await createVerificationState(interaction.user.id)
			// const url = `${base}/modrinth/verify?token=${encodeURIComponent(token)}`
			// await interaction.reply({
			// 	content: `To link your Modrinth account, open: ${url}\nThis link expires in 15 minutes.`,
			// 	ephemeral: true,
			// })
			await interaction.reply({
				content: `Modrinth verification is coming soon! We'll let you know when it's ready.`,
				ephemeral: true,
			})
			return
		}
	},
}

export default verifyCommand
