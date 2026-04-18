import { Client, IncidentActionsEditOptions } from 'discord.js'
import { CronJob } from 'cron'

export function startServerPauseDMs(client: Client) {
	const debug = process.env.CRON_DEBUG_MODE === '1'
	new CronJob(
		debug ? '*/10 * * * * *' : '0 * * * *', // run every hour on prod, every 10 sec on debug

		async function () {
			const incidentActions: IncidentActionsEditOptions = {
				dmsDisabledUntil: Date.now() + 86400000,
			}

			if (!client.guilds.cache.get(process.env.GUILD_ID!)?.incidentsData?.dmsDisabledUntil)
				await client.guilds.setIncidentActions(process.env.GUILD_ID!, incidentActions)
		},
		null,
		true,
		'America/Los_Angeles',
	)
}
