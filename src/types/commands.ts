import type {
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    PermissionResolvable,
    SlashCommandBuilder,
} from 'discord.js'

export type CommandCategory = 'general' | 'moderation' | 'utility' | 'fun' | 'admin'

export interface CommandMeta {
    name: string
    description: string
    category?: CommandCategory
    // If true, only allow in guilds
    guildOnly?: boolean
    // If true, only allow in DMs
    dmOnly?: boolean
    // If set, restrict command to these guild IDs (e.g., for dev commands)
    allowedGuilds?: string[]
    // If set, restrict command to these user IDs
    allowedUsers?: string[]
    // Per-user cooldown in seconds
    cooldownSeconds?: number
    // Required member permissions in a guild to execute
    defaultMemberPermissions?: PermissionResolvable
    // Enables Discord-level DM permission (defaults true)
    dmPermission?: boolean
}

export interface ChatInputCommand {
    // Slash command builder (or compatible object that has toJSON)
    data: SlashCommandBuilder & { toJSON(): any }
    meta: CommandMeta
    execute: (interaction: ChatInputCommandInteraction) => Promise<void> | void
    autocomplete?: (interaction: AutocompleteInteraction) => Promise<void> | void
}

export type AnyCommand = ChatInputCommand

export type CommandMap = Map<string, AnyCommand>

export interface CommandHandlerOptions {
    owners?: string[]
    // Default cooldown if a command doesn't specify one
    defaultCooldownSeconds?: number
    // Log execution and errors
    debug?: boolean
}

export interface CommandHandlers {
    onInteractionCreate: (interaction: any) => Promise<void>
    getAllSlashCommandData: () => any[]
}
