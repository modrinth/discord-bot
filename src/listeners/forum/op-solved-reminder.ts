import { ThreadChannel } from 'discord.js'

import { SOLVED_REMINDER_EMBED } from '../../data/forum'
import { MessageListener } from '../../types'
import { createDefaultEmbed } from '../../utils/embeds'
import { isByThreadOP, isInCommunitySupportThread } from '../../utils/thread'

const solvedPhrases = [
  /\b(thanks|thank you|ty|tysm|appreciate it)\b/i,
  /\b(it works( now)?|fixed( now)?|resolved|issue resolved)\b/i,
  /\bproblem( is)? (gone|solved|fixed)\b/i,
]

function contentIndicatesSolved(content: string | null | undefined): boolean {
  const text = content ?? ''
  return solvedPhrases.some((r) => r.test(text))
}

export const remindSolvedCreate: MessageListener = {
  id: 'forum:community-support:op-solved-reminder:create',
  event: 'create',
  description:
    'When OP posts a solved-like message, remind them to use /solved (create).',
  priority: 5,
  cooldownMs: 60_000,
  filter: { allowBots: false, allowDMs: false },
  match: async (ctx) => {
    if (!('message' in ctx)) return false
    const { message } = ctx
    if (!isInCommunitySupportThread(message)) return false
    if (!(await isByThreadOP(message))) return false
    return contentIndicatesSolved(message.content)
  },
  handle: async (ctx) => {
    if (!('message' in ctx)) return
    const ch = ctx.message.channel as ThreadChannel
    const embed = createDefaultEmbed(SOLVED_REMINDER_EMBED)
    await ch.send({ embeds: [embed] })
  },
}

export const remindSolvedUpdate: MessageListener = {
  id: 'forum:community-support:op-solved-reminder:update',
  event: 'update',
  description:
    'When OP edits a message to indicate solved, remind them to use /solved (update).',
  priority: 5,
  cooldownMs: 60_000,
  filter: { allowBots: false, allowDMs: false },
  match: async (ctx) => {
    if (!('newMessage' in ctx)) return false
    const { newMessage } = ctx
    if (!('channel' in newMessage)) return false
    // PartialMessage may lack content or author; bail if unknown
    const content = (newMessage as any).content as string | undefined
    const authorId = (newMessage as any).author?.id as string | undefined
    if (!content || !authorId) return false
    if (!isInCommunitySupportThread(newMessage as any)) return false
    // Fetch starter to validate OP; we need a Message for isByThreadOP, so cast and rely on cache
    return (
      contentIndicatesSolved(content) && (await isByThreadOP(newMessage as any))
    )
  },
  handle: async (ctx) => {
    if (!('newMessage' in ctx)) return
    const ch = (ctx.newMessage as any).channel as ThreadChannel
    const embed = createDefaultEmbed(SOLVED_REMINDER_EMBED)
    await ch.send({ embeds: [embed] })
  },
}
