import { EmbedData } from 'discord.js'

const data: EmbedData = {
	description: [
		'**👋 Hello! Thank you for creating a new thread on Modrinth server**',
		' ',
		'📃 Something went wrong with the game? Make sure to provide logs using [mclo.gs](https://mclo.gs)',
		"❔ If you're having an issue with Modrinth product, use our [dedicated support portal](<https://support.modrinth.com>) instead",
		' ',
		`🔔 Don't forget to mark your thread as solved if issue has been resolved by using </solved:${process.env.SOLVED_COMMAND_ID}>`,
	].join('\n'),
}

export default data
