import 'dotenv/config'

import { Client, Events, GatewayIntentBits, Partials } from 'discord.js'

import commands from '@/commands'
import { deployCommands } from '@/commands/deploy'
import { createCommandRegistry } from '@/commands/registry'
import listeners from '@/listeners'
import { createMessageHandlers } from '@/types'
import { tryJoinThread } from '@/utils'

// Handle CLI flags before booting the bot
if (process.argv.includes('--deploy-commands')) {
    await deployCommands()
    process.exit(0)
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.User],
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

client.on(Events.MessageCreate, onCreate)
client.on(Events.MessageUpdate, onUpdate)
client.on(Events.MessageDelete, onDelete)

// Slash commands
const commandHandlers = createCommandRegistry(commands, {
    defaultCooldownSeconds: 3,
})
client.on(Events.InteractionCreate, commandHandlers.onInteractionCreate)

client.login(process.env.DISCORD_BOT_TOKEN)
