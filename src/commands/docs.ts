import { SlashCommandBuilder } from 'discord.js'

import type { ChatInputCommand } from '@/types/commands'

export const docsCommand: ChatInputCommand = {
	data: new SlashCommandBuilder()
		.setName('docs')
		.setDescription('Send a link to a documentation page')
		.addStringOption((option) =>
			option
				.setName('path')
				.setDescription(
					'Documentation path (e.g., "contributing/getting-started", "api", "modpacks")',
				)
				.setRequired(true),
		) as SlashCommandBuilder,
	meta: {
		name: 'docs',
		description: 'Send a link to a documentation page',
		category: 'utility',
		cooldownSeconds: 3,
	},
	async execute(interaction) {
		const path = interaction.options.getString('path', true)

		const cleanPath = path.trim().replace(/\s+/g, '')

		const docsUrl = `https://docs.modrinth.com/${cleanPath}`

		await interaction.reply({
			content: docsUrl,
		})
	},
}
