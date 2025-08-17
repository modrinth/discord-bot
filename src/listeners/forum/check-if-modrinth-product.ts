import { ThreadChannel } from 'discord.js'

import { MODRINTH_PROUDCT_EMBED } from '@/data'
import { createDefaultEmbed, isInCommunitySupportThread, isThreadStarterMessage } from '@/utils'

import { CreateListener } from '../../types'

const modrinthProductKeywords = [
	/\b(modrinth app|theseus_gui)\b/i,
	/\b((modrinth|modrinth app|modrinth launcher) crashes)\b/i,
	/\b((fetch|network|authentication |payments )error)\b/i,
	/\b(failed to fetch player profile|unable to read game version tags from any source)\b/i,
]

function contentIndicatesModrinthProduct(content: string | null | undefined): boolean {
	const text = content ?? ''
	return modrinthProductKeywords.some((r) => r.test(text))
}

export const checkIfModrinthProduct: CreateListener = {
	id: 'forum:community-support:check-if-modrinth-product',
	event: 'create',
	description: 'Check new threads in #community-support for requesting help with Modrinth product.',
	priority: 0,
	filter: { allowBots: false, allowDMs: false },
	match: async (ctx: { message: any }) => {
		if (!('message' in ctx)) return false
		const { message } = ctx
		if (!isInCommunitySupportThread(message) && (await isThreadStarterMessage(message)))
			return false
		return contentIndicatesModrinthProduct(message.content)
	},
	handle: async (ctx: any) => {
		const ch = ctx.message.channel as ThreadChannel
		const embed = createDefaultEmbed(MODRINTH_PROUDCT_EMBED).setColor(0xffa347)
		await ch.send({ embeds: [embed] })
	},
}
