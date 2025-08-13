import { SlashCommandBuilder, Snowflake } from 'discord.js'

import type { ChatInputCommand } from '@/types/commands'

import { OP_MARKED_SOLVED_TEXT } from '../data/forum/'

export const solvedCommand: ChatInputCommand = {
    data: new SlashCommandBuilder()
        .setName('solved')
        .setDescription('Mark current thread as solved.'),
    meta: {
        name: 'solved',
        description: 'Mark current thread as solved.',
        category: 'utility',
    },
    async execute(interaction) {
        if (interaction.channel?.isThread()) {
            if (interaction.channel.ownerId === interaction.user.id) {
                await interaction.reply(OP_MARKED_SOLVED_TEXT)

                await interaction.channel.edit({
                    archived: true,
                    appliedTags: [
                        ...interaction.channel.appliedTags,
                        process.env.COMMUNITY_SUPPORT_FORUM_SOLVED_TAG_ID as Snowflake,
                    ],
                })
            } else {
                await interaction.reply({
                    content: 'This command can be only executed by OP.',
                    flags: 'Ephemeral',
                })
            }
        } else {
            await interaction.reply({
                content: 'This command can be only used in forum threads.',
                flags: 'Ephemeral',
            })
        }
    },
}
