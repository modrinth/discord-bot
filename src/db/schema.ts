import { index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
	id: text('id').primaryKey(),
	messagesSent: integer('messages_sent').notNull().default(0),
	crowdinUserId: text('crowdin_user_id'),
	modrinthUserId: text('modrinth_user_id'),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

// Stores short-lived verification state tokens for OAuth CSRF protection
export const oauthVerifications = pgTable(
	'oauth_verifications',
	{
		token: text('token').primaryKey(),
		provider: text('provider').notNull(),
		discordUserId: text('discord_user_id').notNull(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		redirectTo: text('redirect_to'),
	},
	(t) => ({ byProvider: index('oauth_verifications_provider_idx').on(t.provider) }),
)

// Stores Crowdin OAuth tokens mapped to Discord and Crowdin identities
export const crowdinAccounts = pgTable(
	'crowdin_accounts',
	{
		discordUserId: text('discord_user_id').primaryKey(),
		crowdinUserId: text('crowdin_user_id').notNull(),
		accessToken: text('access_token').notNull(),
		refreshToken: text('refresh_token'),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		// enterprise org domain if present
		organizationDomain: text('organization_domain'),
	},
	(t) => ({ byCrowdin: index('crowdin_accounts_user_idx').on(t.crowdinUserId) }),
)

export type CrowdinAccount = typeof crowdinAccounts.$inferSelect
export type NewCrowdinAccount = typeof crowdinAccounts.$inferInsert
