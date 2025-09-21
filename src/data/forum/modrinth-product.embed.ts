import { EmbedData } from 'discord.js'

const data: EmbedData = {
	description: [
		'❔ **Are you having an issue with a Modrinth product?**',
		' ',
		'Community members are not allowed to provide support to our products.',
		'Use our [dedicated support portal](<https://support.modrinth.com>) instead for help with our products.',
		' ',
		`Mark this thread as </solved:${process.env.SOLVED_COMMAND_ID}> if that's correct.`,
	].join('\n'),
}

export default data
