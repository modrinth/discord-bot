import { eq, sql } from 'drizzle-orm'

import { ACTIVE_ROLE_GRANTED_EMBED } from '@/data'
import { db } from '@/db'
import { users } from '@/db/schema'
import { CreateListener } from '@/types'
import { createDefaultEmbed } from '@/utils'

export const countMessages: CreateListener = {
	id: 'global:count-messages',
	event: 'create',
	description: 'Counts messages',
	priority: 0,
	filter: { allowBots: false, allowDMs: false },
	match: async () => true,
	handle: async (ctx) => {
		if (!ctx.message.guild) return
		if (!ctx.message.author) return

		await db
			.insert(users)
			.values({ id: ctx.message.author.id, messagesSent: 1 })
			.onConflictDoUpdate({
				target: users.id,
				set: { messagesSent: sql`${users.messagesSent} + 1` },
			})

		const user = await db
			.select({
				id: users.id,
				messagesSent: users.messagesSent,
			})
			.from(users)
			.where(eq(users.id, ctx.message.author.id))
			.limit(1)

		if (user[0].messagesSent == 20) {
			const guild = ctx.message.guild
			const member = await guild.members.fetch(ctx.message.author.id)
			const roleId = process.env.ACTIVE_ROLE_ID!
			if (!roleId) return

			const alreadyHasRole = member.roles.cache.has(roleId)
			if (alreadyHasRole) {
				return
			}

			await member.roles.add(roleId)
			const embed = createDefaultEmbed(ACTIVE_ROLE_GRANTED_EMBED)
			try {
				await ctx.message.author.send({ embeds: [embed] })
			} catch {
				// ignore DM failures
			}
		}
	},
}
