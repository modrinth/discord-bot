import * as process from 'node:process'

import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { users } from '@/db/schema'
import { ChatInputCommand } from '@/types'
import { info } from '@/logging/logger'
import content from '*?raw'
import { PERMISSION_ERROR_TEXT } from '@/data'

export const resetCommand: ChatInputCommand = {
	data: new SlashCommandBuilder()
		.setName('reset')
		.setDescription("Reset user's active role and message counter")
		.addStringOption((option) =>
			option.setName('id').setDescription('Discord User ID').setRequired(true),
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
		const member = await interaction.guild.members.fetch(id)

		const invoker = await interaction.guild.members.fetch(interaction.user.id)

		if (!invoker.roles.cache.has(process.env.DISCORD_MODERATOR_ROLE_ID!)) {
			await interaction.reply({
				content: PERMISSION_ERROR_TEXT,
				flags: 'Ephemeral',
			})
			return
		}

		await db.update(users).set({ messagesSent: 0 }).where(eq(users.id, id))
		await member.roles.remove(process.env.ACTIVE_ROLE_ID!)

		await interaction.reply({
			content: `User's (\`${member.user.username}\`, ID: ${member.user.id}) active role and message counter has been reset.`,
		})
		info(
			`:pencil: User ${member.user} (\`${member.user.username}\`, ID: ${member.user.id}) has been reset by moderator (\`${interaction.user.username}\`, ID: ${interaction.user.id}).`,
		)
	},
}
