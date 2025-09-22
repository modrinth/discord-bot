import { EmbedBuilder, SlashCommandBuilder } from 'discord.js'

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

			const expireAt = Math.floor(Date.now() / 1000) + 15 * 60 // now + 15 minutes

			const embed = new EmbedBuilder()
				.setColor(0x1bd96a)
				.setTitle('Link your Crowdin account')
				.setDescription(
					[
						'We need to verify your Crowdin account to link it with your Discord.',
						' ',
						'To continue, please click the link down below.',
						' ',
						`**[[Click here to continue →]](${url})**`,
						' ',
						`-# This link will expire <t:${expireAt}:R>`,
					].join('\n'),
				)

			await interaction.reply({
				embeds: [embed],
				flags: 'Ephemeral',
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
			const embed = new EmbedBuilder()
				.setColor(0x1bd96a)
				.setTitle('Link your Modrinth account')
				.setDescription(
					[
						'Modrinth account verification is coming soon!',
						' ',
						"We'll let you know when it's ready.",
					].join('\n'),
				)

			await interaction.reply({
				embeds: [embed],
				flags: 'Ephemeral',
			})
			return
		}
	},
}

export default verifyCommand
