import type { ChatInputCommand } from '@/types/commands'
import { createVerificationState } from '@/web'
import { SlashCommandBuilder } from 'discord.js'

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
		if (sub !== 'crowdin') {
			await interaction.reply({ content: 'Only Crowdin is supported right now.', ephemeral: true })
			return
		}
		const token = await createVerificationState(interaction.user.id)
		const base = process.env.PUBLIC_BASE_URL || 'http://localhost:3000'
		const url = `${base}/crowdin/verify?token=${encodeURIComponent(token)}`
		await interaction.reply({
			content: `To link your Crowdin account, open: ${url}\nThis link expires in 15 minutes.`,
			ephemeral: true,
		})
	},
}

export default verifyCommand
