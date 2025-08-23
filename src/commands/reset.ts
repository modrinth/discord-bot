import { db } from '@/db'
import { users } from '@/db/schema'
import { ChatInputCommand } from '@/types'
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { eq } from 'drizzle-orm'
import * as process from 'node:process'

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

		await db.update(users).set({ messagesSent: 0 }).where(eq(users.id, id))
		await member.roles.remove(process.env.ACTIVE_ROLE_ID!)

		await interaction.reply({
			content: `User's (\`${member.user.username}\`, ID: ${member.user.id}) active role and message counter has been reset.`,
		})
	},
}
