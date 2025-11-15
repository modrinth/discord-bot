import 'dotenv/config'

import { Client, Events, GatewayIntentBits, Partials } from 'discord.js'

import commands from '@/commands'
import listeners from '@/listeners'
import reactionListeners from '@/listeners/reaction'
import { createCommandRegistry, deployCommands, tryJoinThread } from '@/utils'

import { db } from './db'
import { createMessageHandlers, createReactionHandlers } from './types/listeners'
import { startWebServer } from './web'
import { startThreadStaleCheckCron } from '@/cron/threadStaleCheck'

import { setLogger } from './logging/logger'
import { createDiscordLogger } from './logging/discordLogger'

const DEBUG_COMMAND_IDS = process.argv.includes('--debug-command-ids')

// Handle CLI flags before booting the bot
if (process.argv.includes('--deploy-commands')) {
	await deployCommands()
	process.exit(0)
}

await db.execute('select 1')

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMessageReactions,
	],
	partials: [Partials.Message, Partials.Channel, Partials.User, Partials.Reaction],
})

client.once(Events.ClientReady, async (readyClient) => {
	const logger = await createDiscordLogger(client, process.env.LOG_CHANNEL_ID!)
	setLogger(logger)

	logger.info(
		`:sparkles: Modrinth Bot is online! Logged in as (\`${readyClient.user.tag}\`, ID: ${readyClient.user.id}).`,
	)

	// Optionally list all registered application commands and their IDs
	if (DEBUG_COMMAND_IDS) {
		try {
			// Global application commands
			const global = await readyClient.application!.commands.fetch()
			console.log(`[Debug][Commands] Global commands: ${global.size}`)
			for (const [, cmd] of global) {
				console.log(` - /${cmd.name} (${cmd.id})`)
			}

			// Guild-scoped commands per guild
			for (const [, guild] of readyClient.guilds.cache) {
				try {
					const guildCmds = await guild.commands.fetch()
					console.log(
						`[Debug][Commands] Guild ${guild.name} (${guild.id}) commands: ${guildCmds.size}`,
					)
					for (const [, cmd] of guildCmds) {
						console.log(`   - /${cmd.name} (${cmd.id})`)
					}
				} catch (err) {
					console.warn(
						`[Debug][Commands] Failed to fetch guild commands for ${guild.name} (${guild.id})`,
						err,
					)
				}
			}
		} catch (err) {
			console.warn('[Debug][Commands] Failed to fetch application commands', err)
		}
	}
	for (const [, guild] of client.guilds.cache) {
		try {
			const active = await guild.channels.fetchActiveThreads()
			active.threads.forEach(async (thread) => {
				if (thread.parentId === process.env.COMMUNITY_SUPPORT_FORUM_ID) {
					await tryJoinThread(thread)
				}
			})
		} catch {
			// Ignore failures.
		}
	}

	// TODO: Change this to more universal src/cron/index.ts
	startThreadStaleCheckCron(client)
})

// Auto-join newly created threads in #community-support
client.on(Events.ThreadCreate, async (thread) => {
	if (thread.parentId === process.env.COMMUNITY_SUPPORT_FORUM_ID) {
		await tryJoinThread(thread)
	}
})

const { onCreate, onUpdate, onDelete } = createMessageHandlers(listeners, {
	mode: 'all',
})
const { onReactionAdd, onReactionRemove } = createReactionHandlers(reactionListeners, {
	mode: 'all',
})

client.on(Events.MessageCreate, onCreate)
client.on(Events.MessageUpdate, onUpdate)
client.on(Events.MessageDelete, onDelete)

// Slash commands
const commandHandlers = createCommandRegistry(commands, {
	defaultCooldownSeconds: 3,
})
client.on(Events.InteractionCreate, commandHandlers.onInteractionCreate)

// Reaction listeners
client.on(Events.MessageReactionAdd, onReactionAdd)
client.on(Events.MessageReactionRemove, onReactionRemove)

client.login(process.env.DISCORD_BOT_TOKEN)

startWebServer(client)
