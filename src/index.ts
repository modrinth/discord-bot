import 'dotenv/config'

import { Client, Events, GatewayIntentBits, Partials } from 'discord.js'

import listeners from './listeners/index'
import { createMessageHandlers } from './types'
import { tryJoinThread } from './utils/threads'

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

client.login(process.env.DISCORD_BOT_TOKEN)
