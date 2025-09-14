import 'dotenv/config'

import { Client, Events, GatewayIntentBits, Partials } from 'discord.js'

import commands from '@/commands'
import listeners from '@/listeners'
import reactionListeners from '@/listeners/reaction'
import { createCommandRegistry, deployCommands, tryJoinThread } from '@/utils'

import { db } from './db'
import { createMessageHandlers, createReactionHandlers } from './types/listeners'
import { startWebServer } from './web'

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
	console.log(`Bot is ready, logged in as ${readyClient.user.tag}`)
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
