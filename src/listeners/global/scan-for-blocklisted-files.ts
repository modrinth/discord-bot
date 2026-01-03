import { BLOCKLISTED_FILE_EXTENSIONS } from '@/data/misc'
import { CreateListener } from '@/types'
import { toHumanFileSize } from '@/utils'
import { info } from '@/logging/logger'
import { CategoryChannel, Channel, GuildChannel, TextChannel, ThreadChannel } from 'discord.js'

function getFileExtension(filename: string): string | null {
	const parts = filename.split('.')
	return parts.length > 1 ? parts.pop() || null : null
}

export const scanForBlocklistedFiles: CreateListener = {
	id: 'global:scan-for-blocklisted-files',
	event: 'create',
	description: 'Scans message attachments for blocklisted file extensions',
	priority: 0,
	filter: { allowBots: false, allowDMs: false },
	match: async () => true,
	handle: async (ctx) => {
		if (!ctx.message.guild) return
		if (!ctx.message.author) return
		if (!ctx.message.attachments) return

		for (const attachment of ctx.message.attachments.values()) {
			if (!attachment.name) continue

			const ext = getFileExtension(attachment.name)
			if (!ext) continue

			if (BLOCKLISTED_FILE_EXTENSIONS.includes(ext)) {
				await ctx.message.delete()

				const channel = await ctx.client.channels.fetch(process.env.MOD_CHANNEL_ID!)

				if (channel && channel.isTextBased()) {
					await (channel as TextChannel).send(
						[
							`⚠️ User ${ctx.message.author} (\`${ctx.message.author.username}\`, ID: ${ctx.message.author.id}) attempted to sent a blacklisted file type in ${ctx.message.channel}.`,
							`> Filename: \`${attachment.name}\``,
							`> Size: ${toHumanFileSize(attachment.size)}`,
						].join('\n'),
					)
				}
			}
		}
	},
}
