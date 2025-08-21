import { CreateListener } from '@/types'
import { BLOCKLISTED_FILE_EXTENSIONS } from '@/data/misc'
import blocklistedFileExtensions from '@/data/misc/blocklisted-file-extensions'

function getFileExtension(filename: string): string | null {
	const parts = filename.split('.')
	return parts.length > 1 ? parts.pop() || null : null
}

export const scanForBlocklistedFiles: CreateListener = {
	id: 'global:scan-for-blocklisted-files',
	event: 'create',
	description: 'Scans message attachments for blocklisted file extentions',
	priority: 0,
	filter: { allowBots: false, allowDMs: false },
	match: async (ctx) => true,
	handle: async (ctx) => {
		if (!ctx.message.guild) return
		if (!ctx.message.author) return
		if (!ctx.message.attachments) return

		ctx.message.attachments.forEach((attachment) => {
			if (attachment.name.length === 0) return
			if (blocklistedFileExtensions.includes(<string>getFileExtension(attachment.name))) {
				ctx.message.delete()

				// TODO: Alert mods.
			}
		})
	},
}
