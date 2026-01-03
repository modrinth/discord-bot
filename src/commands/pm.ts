import { ChatInputCommand } from '@/types'
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js'

export const pmCommand: ChatInputCommand = {
	data: new SlashCommandBuilder()
		.setName('pm')
		.setDescription('Send a private message.')
		.addStringOption((option) =>
			option.setName('id').setDescription('Discord User ID').setRequired(true),
		)
		.addStringOption((option) =>
			option.setName('message').setDescription('Private message').setRequired(true),
		)
		.addStringOption((option) =>
			option.setName('title').setDescription('Embed title').setRequired(false),
		) as SlashCommandBuilder,
	meta: {
		name: 'reset',
		description: 'Reset user active role and message counter',
		category: 'moderation',
		guildOnly: true,
	},
	execute: async (interaction: ChatInputCommandInteraction) => {
		if (!interaction.guild) return

		const id = interaction.options.getString('id', true)
		const message = interaction.options.getString('message', true)
		const title = interaction.options.getString('title', false)
		const member = await interaction.guild.members.fetch(id)

		const embed = new EmbedBuilder()
			.setColor(0x1bd96a)
			.setTitle(title ? title : 'Message from a moderator')
			.setDescription(message)

		await member.user.send({ embeds: [embed] })
	},
}
