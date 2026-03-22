import { EmbedData } from 'discord.js'

const data: EmbedData = {
	title: 'TSAM - Discord Account Restricted',
	description:
		'Your **Trust Score** has fallen below the required threshold, so your account has been temporarily restricted.\n\n' +
		'This action is automatically applied when our moderation system detects suspicious activity or potential rule violations.\n\n' +
		'While restricted, some server features and channels may be unavailable to you.\n\n' +
		'If you believe this action was applied in error, please contact us via <@1468988872267665492>.',
	footer: {
		text: 'Trust Score Auto Moderation',
	},
	color: 0xff496e,
}

export default data
