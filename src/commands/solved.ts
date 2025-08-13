import { SlashCommandBuilder } from 'discord.js'

import type { ChatInputCommand } from '@/types/commands'

import { OP_MARKED_SOLVED } from '../data/forum/'

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
                await interaction.reply(OP_MARKED_SOLVED)

                await interaction.channel.setArchived(true, 'Thread marked as solved.')
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
