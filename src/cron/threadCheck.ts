import type { Client } from 'discord.js'
import { CronJob } from 'cron'
import { createDefaultEmbed } from '@/utils'

export function startThreadCheckCron(client: Client) {
	const job = new CronJob(
		'0 * * * *', // run every hour
		async function () {
			console.log('[Cron] Checking inactive threads...')

			for (const [, guild] of client.guilds.cache) {
				try {
					const active = await guild.channels.fetchActiveThreads()

					for (const [, thread] of active.threads) {
						if (thread.parentId !== process.env.COMMUNITY_SUPPORT_FORUM_ID) continue

						// Last message
						const lastMessage = thread.lastMessageId
							? await thread.messages.fetch(thread.lastMessageId).catch(() => null)
							: null

						const inactiveFor = lastMessage ? Date.now() - lastMessage.createdTimestamp : Infinity

						// thresholds
						const warnThreshold = 1000 * 60 * 60 * 24 * 2 // 2 days
						const archiveThreshold = 1000 * 60 * 60 * 24 * 4 // 4 days

						if (inactiveFor > archiveThreshold) {
							console.log(`[Cron] Marking inactive thread as solved: ${thread.name}`)

							const embed = createDefaultEmbed({
								title: ':lock: Thread archived',
								description: 'This thread has been archived due to inactivity.',
							}).setColor(0xffa347)

							await thread.send({ embeds: [embed] })
							await thread
								.edit({
									archived: true,
									appliedTags: [process.env.COMMUNITY_SUPPORT_FORUM_SOLVED_TAG_ID!],
								})
								.catch(() => {})
						} else if (inactiveFor > warnThreshold) {
							const unixTs = Math.floor(lastMessage?.createdTimestamp! / 1000)
							const warningMsg = `-# ⚠️ This thread has been inactive since <t:${unixTs}:R>. It will be automatically archived soon.`

							// Prevent spam: don’t re-send warning if already sent
							const recentMsgs = await thread.messages.fetch({ limit: 10 })
							const alreadyWarned = recentMsgs.some(
								(m) =>
									m.author.id === client.user?.id && m.content.includes('automatically archived'),
							)

							if (!alreadyWarned) {
								console.log(`[Cron] Warning in thread: ${thread.name}`)
								await thread.send(warningMsg).catch(() => {})
							}
						}
					}
				} catch (err) {
					console.warn(`[Cron] Failed to check guild ${guild.id}`, err)
				}
			}
		},
		null,
		true,
		'America/Los_Angeles',
	)
}
