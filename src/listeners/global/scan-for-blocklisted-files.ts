import { BLOCKLISTED_FILE_EXTENSIONS } from '@/data/misc'
import { CreateListener } from '@/types'
import { toHumanFileSize } from '@/utils'

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

		ctx.message.attachments.forEach((attachment) => {
			if (attachment.name.length === 0) return
			if (BLOCKLISTED_FILE_EXTENSIONS.includes(<string>getFileExtension(attachment.name))) {
				ctx.message.delete()

				// TODO: Alert mods.
				if (ctx.message.channel.isSendable()) {
					ctx.message.channel.send(
						[
							`⚠️ User ${ctx.message.author} (\`${ctx.message.author.username}\`, ID: ${ctx.message.author.id}) attempted to sent a blacklisted file type in ${ctx.message.channel}.`,
							`> Filename: \`${attachment.name}\``,
							`> Size: ${toHumanFileSize(attachment.size)}`,
						].join('\n'),
					)
				}
			}
		})
	},
}
