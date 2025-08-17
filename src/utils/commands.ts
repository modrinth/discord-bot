import {
	Collection,
	Interaction,
	PermissionsBitField,
	REST,
	Routes,
	SlashCommandBuilder,
} from 'discord.js'

import commands from '../commands/'
import type {
	AnyCommand,
	CommandHandlerOptions,
	CommandHandlers,
	CommandMap,
} from '../types/commands'

type CooldownKey = string // `${userId}:${commandName}`

export function createCommandRegistry(
	commands: AnyCommand[],
	opts: CommandHandlerOptions = {},
): CommandHandlers {
	const map: CommandMap = new Map(commands.map((c) => [c.meta.name, c]))
	const cooldowns = new Collection<CooldownKey, number>()
	const defaultCooldown = opts.defaultCooldownSeconds ?? 3

	function isAllowedGuild(cmd: AnyCommand, guildId?: string | null) {
		if (!guildId) return !(cmd.meta.guildOnly ?? false)
		if (cmd.meta.allowedGuilds?.length) {
			return cmd.meta.allowedGuilds.includes(guildId)
		}
		return true
	}

	function isAllowedUser(cmd: AnyCommand, userId: string) {
		if (cmd.meta.allowedUsers?.length) {
			return cmd.meta.allowedUsers.includes(userId)
		}
		return true
	}

	function checkCooldown(userId: string, name: string, seconds: number) {
		const key = `${userId}:${name}`
		const now = Date.now()
		const until = cooldowns.get(key)
		if (until && until > now) {
			return Math.ceil((until - now) / 1000)
		}
		cooldowns.set(key, now + seconds * 1000)
		return 0
	}

	async function onInteractionCreate(interaction: Interaction) {
		if (!interaction.isChatInputCommand()) return

		const cmd = map.get(interaction.commandName)
		if (!cmd) return

		// Context checks
		if (cmd.meta.dmOnly && interaction.inGuild()) return
		if (cmd.meta.guildOnly && !interaction.inGuild()) return
		if (!isAllowedGuild(cmd, interaction.guildId)) return
		if (!isAllowedUser(cmd, interaction.user.id)) return

		// Cooldown
		const cd = cmd.meta.cooldownSeconds ?? defaultCooldown
		if (cd > 0) {
			const remain = checkCooldown(interaction.user.id, cmd.meta.name, cd)
			if (remain > 0) {
				if (interaction.deferred || interaction.replied) return
				await interaction.reply({
					content: `Please wait ${remain}s before using /${cmd.meta.name} again.`,
					ephemeral: true,
				})
				return
			}
		}

		try {
			await Promise.resolve(cmd.execute(interaction))
		} catch (err) {
			if (opts.debug) console.error(`[command:${cmd.meta.name}]`, err)
			const content = 'There was an error while executing this command.'
			if (interaction.deferred || interaction.replied) {
				await interaction.followUp({ content, ephemeral: true }).catch(() => {})
			} else {
				await interaction.reply({ content, ephemeral: true }).catch(() => {})
			}
		}
	}

	function getAllSlashCommandData() {
		return Array.from(map.values()).map((c) => {
			const builder = c.data as SlashCommandBuilder
			if (c.meta.defaultMemberPermissions !== undefined) {
				const bits = new PermissionsBitField(c.meta.defaultMemberPermissions as any).bitfield
				builder.setDefaultMemberPermissions(bits)
			}
			if (c.meta.dmPermission !== undefined) {
				builder.setDMPermission(c.meta.dmPermission)
			}
			return builder.toJSON()
		})
	}

	return {
		onInteractionCreate,
		getAllSlashCommandData,
	}
}

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

	try {
		await rest.put(Routes.applicationCommands(clientId), { body: [] })
		console.log('Successfully deleted all application commands.')

		await rest.put(Routes.applicationCommands(clientId), { body })
		console.log(`Registered ${body.length} application command(s).`)
	} catch (err) {
		console.error(err)
	}
}
