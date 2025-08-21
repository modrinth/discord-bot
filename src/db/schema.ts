import { integer, pgTable, text } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
	id: text('id').primaryKey(),
	messagesSent: integer('messages_sent').notNull().default(0),
	crowdinUserId: text('crowdin_user_id'),
	modrinthUserId: text('modrinth_user_id'),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
