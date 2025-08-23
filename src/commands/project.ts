import { ChatInputCommand } from '@/types'
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { ModrinthApi } from '@/api'

export const projectCommand: ChatInputCommand = {
	data: new SlashCommandBuilder()
		.setName('project')
		.setDescription('Fetch a Modrinth project')
		.addStringOption((option) =>
			option.setName('id').setDescription('Modrinth Project ID').setRequired(true),
		) as SlashCommandBuilder,
	meta: {
		name: 'project',
		description: 'Fetch a Modrinth project',
		category: 'utility',
	},
	async execute(interaction: ChatInputCommandInteraction) {
		const projectId = interaction.options.getString('id')
		if (!projectId) return

		try {
			const project = await ModrinthApi.getProject(projectId)

			const embed = new EmbedBuilder()
				.setTitle(project.title)
				.setURL(`https://modrinth.com/project/${project.slug}`)
				.setDescription(project.description)
				.setThumbnail(project.icon_url)
				.setFooter({
					text: `${String(project.project_type).charAt(0).toUpperCase() + String(project.project_type).slice(1)} on Modrinth`,
				})
				.setColor(project.color)

			await interaction.reply({
				embeds: [embed],
			})
		} catch {
			await interaction.reply({ content: 'Failed to fetch Modrinth project.', flags: 'Ephemeral' })
		}
	},
}
