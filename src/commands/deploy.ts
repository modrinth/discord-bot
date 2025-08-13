import 'dotenv/config'

import { REST, Routes } from 'discord.js'

import commands from '.'
import { createCommandRegistry } from './registry'

export async function deployCommands() {
    const token = process.env.DISCORD_BOT_TOKEN
    const clientId = process.env.DISCORD_CLIENT_ID
    if (!token || !clientId) {
        console.error('Missing DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID')
        process.exit(1)
    }

    const registry = createCommandRegistry(commands)
    const body = registry.getAllSlashCommandData()

    const rest = new REST().setToken(token)

    // Global registration; use Routes.applicationGuildCommands for per-guild
    await rest.put(Routes.applicationCommands(clientId), { body })
    console.log(`Registered ${body.length} application command(s).`)
}
