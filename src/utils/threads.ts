import { AnyThreadChannel, ThreadChannel } from 'discord.js'

/**
 * Attempts to join a thread, ignoring errors and no-op if already joined.
 */
export async function tryJoinThread(
  thread: ThreadChannel | AnyThreadChannel,
): Promise<void> {
  try {
    // Avoid joining if already in the thread (best-effort using available flags)
    const joined = (thread as ThreadChannel).joined ?? false
    // Some environments expose `joinable`; if present and false, skip
    const joinable: boolean | undefined = (thread as any).joinable
    if (joined) return
    if (joinable === false) return
    await thread.join()
  } catch {
    // Silently ignore permission/api errors; thread events may still flow if already joined
  }
}
