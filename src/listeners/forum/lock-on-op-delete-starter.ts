import { ThreadChannel } from 'discord.js'

import { OP_DELETE_LOCK_EMBED } from '../../data/forum'
import { MessageListener } from '../../types'
import { createDefaultEmbed } from '../../utils/embeds'
import { isInCommunitySupportThread } from '../../utils/threads'

export const lockOnOpDeletesStarter: MessageListener = {
    id: 'forum:community-support:lock-on-op-delete-starter',
    event: 'delete',
    description: 'Auto lock/archive the thread when the starter message is deleted by the OP.',
    priority: 10,
    filter: { allowBots: true, allowDMs: false },
    match: async (ctx) => {
        if (!('message' in ctx)) return false
        const { message } = ctx
        if (!('channel' in message)) return false
        if (!isInCommunitySupportThread(message as any)) return false
        const ch = (message as any).channel as ThreadChannel
        try {
            const starter = await ch.fetchStarterMessage()
            return !!starter && starter.id === (message as any).id
        } catch {
            return false
        }
    },
    handle: async (ctx) => {
        if (!('message' in ctx)) return
        const ch = (ctx.message as any).channel as ThreadChannel
        try {
            const embed = createDefaultEmbed(OP_DELETE_LOCK_EMBED)
            await ch.send({ embeds: [embed] }).catch(() => {})

            if (!ch.archived) await ch.setArchived(true, 'OP deleted starter message')
            if (!ch.locked) await ch.setLocked(true, 'OP deleted starter message')
        } catch {
            // Ignore permission errors
        }
    },
}
