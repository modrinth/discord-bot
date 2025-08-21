import type { ChatInputCommand } from '@/types/commands'
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
		// For now, do nothing besides acknowledge.
		const sub = interaction.options.getSubcommand()
		await interaction.reply({
			content: `Verification flow for '${sub}' will be available soon.`,
			ephemeral: true,
		})
	},
}

export default verifyCommand
