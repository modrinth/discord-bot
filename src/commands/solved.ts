import { SlashCommandBuilder, Snowflake } from 'discord.js'

import type { ChatInputCommand } from '@/types/commands'

import { OP_MARKED_SOLVED_TEXT } from '../data/forum/'
import { OP_ONLY_ERROR_TEXT, FORUM_ONLY_ERROR_TEXT } from '../data/errors/'

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
                    content: OP_ONLY_ERROR_TEXT,
                    flags: 'Ephemeral',
                })
            }
        } else {
            await interaction.reply({
                content: FORUM_ONLY_ERROR_TEXT,
                flags: 'Ephemeral',
            })
        }
    },
}
