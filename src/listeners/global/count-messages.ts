import { CreateListener } from '@/types'
import { isByActivatedUser } from '@/utils/users'
import { GuildMember } from 'discord.js'

export const countMessages: CreateListener = {
	id: 'global:count-messages',
	event: 'create',
	description: 'Counts messages',
	priority: 0,
	filter: { allowBots: false, allowDMs: false },
	match: async (ctx) => true,
	handle: async (ctx) => {
		if (!ctx.message.guild) return
		if (!ctx.message.author) return
		const member = ctx.message.guild.members.cache.get(ctx.message.author.id) as GuildMember

		// TODO: Increment messages in the database.

		// if (isByActivatedUser(member)) {
		// 	await ctx.message.reply('Activated User: true')
		// } else {
		// 	await ctx.message.reply('Activated User: false')
		// }
	},
}
