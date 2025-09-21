import { DONT_UPLOAD_RAW_LOGS } from '@/data/misc'
import { CreateListener } from '@/types'
import { toHumanFileSize } from '@/utils'
import content from '*?raw'

function isMinecraftLogFile(filename: string): boolean {
	const normalized = filename.toLowerCase()

	const exactMatches = new Set(['message.txt', 'latest.log', 'debug.log', 'launcher_log.txt'])

	if (exactMatches.has(normalized)) {
		return true
	}

	// Match crash reports like crash-2025-09-21_17.34.56-client.txt
	return /^crash-\d{4}-\d{2}-\d{2}_\d{2}\.\d{2}\.\d{2}-(client|server)\.txt$/.test(normalized)
}

export const scanForRawLogs: CreateListener = {
	id: 'global:scan-for-raw-logs',
	event: 'create',
	description: 'Scans message attachments for raw logs',
	priority: 0,
	filter: { allowBots: false, allowDMs: false },
	match: async () => true,
	handle: async (ctx) => {
		if (!ctx.message.guild) return
		if (!ctx.message.author) return
		if (!ctx.message.attachments) return

		ctx.message.attachments.forEach((attachment) => {
			if (attachment.name.length === 0) return
			if (isMinecraftLogFile(attachment.name)) {
				ctx.message.reply(DONT_UPLOAD_RAW_LOGS)
			}
		})
	},
}
