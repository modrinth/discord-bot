import { db } from '@/db'
import { users } from '@/db/schema'
import { CreateListener } from '@/types'
import { eq, sql } from 'drizzle-orm'

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
			// give user the trusted role
			const guild = ctx.message.guild
			const member = await guild.members.fetch(ctx.message.author.id)
			await member.roles.add(process.env.ACTIVE_ROLE_ID!)
			ctx.message.author.send(
				`You have been given the active role in the Modrinth community. You will now be able to upload images and share links. Please use this power responsibly, abuse will lead to removal of this role.`,
			)
		}
	},
}
