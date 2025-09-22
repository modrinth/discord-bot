import { GuildMember } from 'discord.js'

import { CreateListener } from '@/types'
import { isByActivatedUser } from '@/utils/users'

function capitalizeFirstChar(name: string): string {
	if (!name) return ''
	return name[0].toUpperCase() + name.slice(1)
}

export const enforceNamePolicy: CreateListener = {
	id: 'global:enforce-name-policy',
	event: 'create',
	description: 'Enforces name policy',
	priority: 0,
	filter: { allowBots: false, allowDMs: false },
	match: async () => true,
	handle: async (ctx) => {
		if (!ctx.message.guild) return
		if (!ctx.message.author) return

		const member = ctx.message.guild.members.cache.get(ctx.message.author.id) as GuildMember
		if (!member) return

		// Skip enforcement for activated members
		if (isByActivatedUser(member)) return

		const displayName = member.displayName.toLowerCase()

		const namePolicy = /^[\u0020-\u024F\-'. ]+$/u

		if (!namePolicy.test(displayName)) {
			// At this point, name violates the policy.
			console.log(`Name policy violation: ${displayName} (${member.id})`)
			try {
				await member.setNickname(capitalizeFirstChar(member.user.username), 'Name policy violation')
			} catch (err) {
				console.error(`Failed to update nickname for ${member.id}:`, err)
			}

			// 	TODO: Log this action
		}
	},
}
