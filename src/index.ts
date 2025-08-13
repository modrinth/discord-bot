import { Client, Events, GatewayIntentBits, Partials } from 'discord.js'
import { createMessageHandlers } from './types'
import listeners from './listeners/index'
import { CHANNELS, isConfiguredChannel } from './config/ids'
import { tryJoinThread } from './utils/threads'
import 'dotenv/config'

const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
], partials: [
    Partials.Message,
    Partials.Channel,
    Partials.User,
] });

client.once(Events.ClientReady, async readyClient => {
    console.log(`Bot is ready, logged in as ${readyClient.user.tag}`);
    // Best-effort: join existing active threads in #community-support so we receive their message events
    if (isConfiguredChannel(CHANNELS.COMMUNITY_SUPPORT)) {
        for (const [, guild] of client.guilds.cache) {
            try {
                const active = await guild.channels.fetchActiveThreads();
                active.threads.forEach(async (thread) => {
                    if (thread.parentId === CHANNELS.COMMUNITY_SUPPORT) {
                        await tryJoinThread(thread);
                    }
                });
            } catch {}
        }
    }
});

// Auto-join newly created threads in #community-support
client.on(Events.ThreadCreate, async (thread) => {
    if (isConfiguredChannel(CHANNELS.COMMUNITY_SUPPORT) && thread.parentId === CHANNELS.COMMUNITY_SUPPORT) {
        await tryJoinThread(thread);
    }
});

const { onCreate, onUpdate, onDelete } = createMessageHandlers(listeners, { mode: 'all' });

client.on(Events.MessageCreate, onCreate);
client.on(Events.MessageUpdate, onUpdate);
client.on(Events.MessageDelete, onDelete);

client.login(process.env.DISCORD_BOT_TOKEN);