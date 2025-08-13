import { ThreadChannel } from 'discord.js';
import { CreateListener } from '../../types';
import { isInCommunitySupportThread, isThreadStarterMessage } from '../../utils/thread';

export const greetCommunitySupport: CreateListener = {
  id: 'forum:community-support:greet',
  event: 'create',
  description: 'Greet new threads in #community-support with usage and support tips.',
  priority: 0,
  filter: { allowBots: false, allowDMs: false },
  match: async (ctx) => isInCommunitySupportThread(ctx.message) && (await isThreadStarterMessage(ctx.message)),
  handle: async (ctx) => {
    const ch = ctx.message.channel as ThreadChannel;
    const text = [
      'Welcome to community-support! Here are some tips to get help faster:',
      '• Describe your issue clearly and include steps to reproduce.',
      '• If your game crashed, please upload your latest log to https://mclo.gs and share the link here.',
      '• If your issue is about a Modrinth product (site, app, API), please contact Modrinth Support instead.',
    ].join('\n');
    await ch.send(text);
  },
};
