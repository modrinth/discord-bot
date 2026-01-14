import { ChatInputCommand } from '@/types'
import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	GuildMemberRoleManager,
	SlashCommandBuilder,
} from 'discord.js'
import process from 'node:process'
import { PERMISSION_ERROR_TEXT } from '@/data'
import { info } from '@/logging/logger'

export const pmCommand: ChatInputCommand = {
	data: new SlashCommandBuilder()
		.setName('pm')
		.setDescription('Send a private message')
		.addStringOption((option) =>
			option.setName('id').setDescription('Discord User ID').setRequired(true),
		)
		.addStringOption((option) =>
			option.setName('reason').setDescription('Reason for sending a message').setRequired(true),
		)
		.addStringOption((option) =>
			option.setName('message').setDescription('Private message').setRequired(true),
		)
		.addStringOption((option) =>
			option.setName('title').setDescription('Embed title').setRequired(false),
		) as SlashCommandBuilder,
	meta: {
		name: 'pm',
		description: 'Send a private message',
		category: 'moderation',
		guildOnly: true,
	},
	execute: async (interaction: ChatInputCommandInteraction) => {
		if (!interaction.guild || !interaction.member) return
		if (
			!(interaction.member.roles as GuildMemberRoleManager).cache.has(
				process.env.DISCORD_MODERATOR_ROLE_ID!,
			)
		) {
			await interaction.reply({
				content: PERMISSION_ERROR_TEXT,
				flags: 'Ephemeral',
			})
			return
		}

		const id = interaction.options.getString('id', true)
		const reason = interaction.options.getString('reason', true)
		const message = interaction.options.getString('message', true)
		const title = interaction.options.getString('title', false)
		const member = await interaction.guild.members.fetch(id)

		const embed = new EmbedBuilder()
			.setColor(0x1bd96a)
			.setTitle(title ? title : 'Message from a moderator')
			.setDescription(message)

		await member.user.send({ embeds: [embed] })
		await interaction.reply({
			content: 'Private message has been successfully sent!',
			flags: 'Ephemeral',
		})
		info(
			`:incoming_envelope: Moderator (\`${interaction.user.username}\`, ID: ${interaction.user.id}) has sent a private message to a user ${member.user} (\`${member.user.username}\`, ID: ${member.user.id}), with a reason: ${reason}.`,
		)
	},
}
