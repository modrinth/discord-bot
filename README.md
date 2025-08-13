# Modrinth Discord Bot

## Environment variables

Required:

- `DISCORD_BOT_TOKEN`: Bot token for login.
- `COMMUNITY_SUPPORT_FORUM_ID`: Channel ID of the community-support forum.

Optional embed styling (used by utils/embeds.ts):

- `EMBED_COLOR`: Hex (`#00FF88`), `0x`-prefixed, decimal, or a named color.
- `EMBED_AUTHOR_NAME`: Default author name for embeds.
- `EMBED_AUTHOR_ICON_URL`: Default author icon URL.
- `EMBED_FOOTER_TEXT`: Default footer text.
- `EMBED_FOOTER_ICON_URL`: Default footer icon URL.
- `EMBED_THUMBNAIL_URL`: Default thumbnail URL.
- `EMBED_TIMESTAMP`: `true` (default) or `false` to include a timestamp.

## Development

Install deps and run in dev mode:

```powershell
pnpm install
pnpm dev
```

Format and lint:

```powershell
pnpm run fix
```
