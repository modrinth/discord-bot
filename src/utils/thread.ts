import { Message, ThreadChannel } from 'discord.js';

/** Returns true if the message is in a thread under the #community-support forum. */
export function isInCommunitySupportThread(message: Message): message is Message & { channel: ThreadChannel } {
  if (!message.guildId) return false;
  const ch = message.channel;
  if (!('isThread' in ch) || !ch.isThread()) return false;
  return ch.parentId === process.env.COMMUNITY_SUPPORT_FORUM_ID;
}

/** Returns true if the message is the starter message of its thread. */
export async function isThreadStarterMessage(message: Message): Promise<boolean> {
  const ch = message.channel;
  if (!('isThread' in ch) || !ch.isThread()) return false;
  try {
    const starter = await ch.fetchStarterMessage();
    return !!starter && starter.id === message.id;
  } catch {
    return false;
  }
}

/** Returns true if the given message was authored by the thread starter (OP). */
export async function isByThreadOP(message: Message): Promise<boolean> {
  const ch = message.channel;
  if (!('isThread' in ch) || !ch.isThread()) return false;
  try {
    const starter = await ch.fetchStarterMessage();
    return !!starter && starter.author?.id === message.author.id;
  } catch {
    return false;
  }
}

