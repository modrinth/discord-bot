export const CHANNELS = {
  COMMUNITY_SUPPORT: process.env.COMMUNITY_SUPPORT_FORUM_ID,
} as const;

export function isConfiguredChannel(id?: string | null): id is string {
  return typeof id === 'string' && id.length > 0;
}

