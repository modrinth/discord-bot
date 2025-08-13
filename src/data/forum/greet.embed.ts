import { EmbedData } from 'discord.js'

const data: EmbedData = {
    title: 'Welcome to community-support!',
    description: [
        'Here are some tips to get help faster:',
        '• Describe your issue clearly and include steps to reproduce.',
        '• If your game crashed, please upload your latest log to https://mclo.gs and share the link here.',
        '• If your issue is about a Modrinth product (site, app, API), please contact Modrinth Support instead.',
    ].join('\n'),
}

export default data
