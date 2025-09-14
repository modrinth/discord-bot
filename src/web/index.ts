import { CrowdinOauthHelper, ModrinthApi, ModrinthOauthHelper } from '@/api/'
import { db } from '@/db'
import { crowdinAccounts, oauthVerifications, users } from '@/db/schema'
import type { Client } from 'discord.js'
import { and, eq, gt } from 'drizzle-orm'
import express, { Request, Response } from 'express'
import { randomBytes } from 'node:crypto'
import htmlClosePage from './close.html?raw'

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000
const BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:3000'
const GUILD_ID = process.env.GUILD_ID!
const TRANSLATOR_ROLE_ID = process.env.TRANSLATOR_ROLE_ID || process.env.ACTIVE_ROLE_ID!
const CROWDIN_SCOPES = 'project'
const VERIFIED_CREATOR_ROLE_ID = process.env.VERIFIED_CREATOR_ROLE_ID || ''

const inflightStates = new Map<string, number>()

export function startWebServer(client: Client) {
	const app = express()
	app.use(express.json())

	const crowdin = new CrowdinOauthHelper({
		baseUrl: BASE_URL,
		clientId: process.env.CROWDIN_CLIENT_ID!,
		clientSecret: process.env.CROWDIN_CLIENT_SECRET!,
		scopes: CROWDIN_SCOPES,
	})

	const modrinth = new ModrinthOauthHelper({
		baseUrl: BASE_URL,
		clientId: process.env.MODRINTH_CLIENT_ID!,
		clientSecret: process.env.MODRINTH_CLIENT_SECRET!,
		scopes: process.env.MODRINTH_SCOPES || '',
	})

	app.get('/healthz', (_req: Request, res: Response) => res.send('ok'))

	// ---------- Modrinth Verified Creator flow ----------
	app.get('/modrinth/verify', async (req: Request, res: Response) => {
		const token = (req.query.token as string) || ''
		if (!token) return res.status(400).send('Missing token')
		const records = await db
			.select()
			.from(oauthVerifications)
			.where(and(eq(oauthVerifications.token, token), gt(oauthVerifications.expiresAt, new Date())))
		if (records.length === 0) return res.status(400).send('Invalid or expired token')
		const authUrl = modrinth.buildAuthorizeUrl(token)
		res.redirect(authUrl)
	})

	app.get('/callback/modrinth', async (req: Request, res: Response) => {
		const code = req.query.code as string
		const state = req.query.state as string
		if (!code || !state) return res.status(400).send('Missing code/state')
		if (!inflightStates.has(state)) inflightStates.set(state, 0)
		const now = Date.now()
		const last = inflightStates.get(state)!
		if (now - last < 60_000) return res.status(429).send('Request already in progress')
		inflightStates.set(state, now)
		const [stateRow] = await db
			.select()
			.from(oauthVerifications)
			.where(and(eq(oauthVerifications.token, state), gt(oauthVerifications.expiresAt, new Date())))
		if (!stateRow) return res.status(400).send('Invalid or expired state')
		try {
			const token = await modrinth.exchangeCodeForToken(code)
			const user = await modrinth.getCurrentUser(token.access_token)

			await db
				.insert(users)
				.values({ id: stateRow.discordUserId, modrinthUserId: String(user.id) })
				.onConflictDoUpdate({ target: users.id, set: { modrinthUserId: String(user.id) } })

			const projects = await ModrinthApi.getUserProjects(user.id)
			const weights: Record<string, number> = {
				mod: 1,
				plugin: 3,
				resourcepack: 1,
				shader: 3,
				modpack: 0.2,
				datapack: 1,
			}
			const totalWeighted = projects.reduce((acc, p) => {
				const w = (weights as any)[p.project_type] ?? 1
				const d = p.downloads ?? 0
				return acc + w * d
			}, 0)
			const threshold = Number(process.env.CREATOR_DOWNLOADS_THRESHOLD ?? 20000)

			if (!client.isReady()) {
				await new Promise<void>((resolve) => client.once('ready', () => resolve()))
			}
			const guild = await client.guilds.fetch(GUILD_ID)
			const member = await guild.members.fetch(stateRow.discordUserId).catch(() => null)
			if (member) {
				if (totalWeighted >= threshold && VERIFIED_CREATOR_ROLE_ID) {
					await member.roles.add(VERIFIED_CREATOR_ROLE_ID).catch((err) => {
						console.error('[Discord][ERROR] Failed to grant creator role', err)
					})
				}
				try {
					await member.send(
						totalWeighted >= threshold
							? 'Your Modrinth account is linked and you qualify for the creator role. The role has been granted.'
							: `Your Modrinth account is linked, but you do not meet the current threshold yet. Weighted downloads: ${Math.floor(totalWeighted)}.`,
					)
				} catch {}
			}

			await db.delete(oauthVerifications).where(eq(oauthVerifications.token, state))
			res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(htmlClosePage)
		} catch (e: any) {
			console.error('[OAuth][Modrinth][ERROR]', e)
			res.status(500).send(`OAuth failed: ${e?.message ?? 'unknown error'}`)
		} finally {
			setTimeout(() => inflightStates.delete(state), 5_000)
		}
	})

	app.get('/crowdin/verify', async (req: Request, res: Response) => {
		const token = (req.query.token as string) || ''
		if (!token) return res.status(400).send('Missing token')

		const records = await db
			.select()
			.from(oauthVerifications)
			.where(and(eq(oauthVerifications.token, token), gt(oauthVerifications.expiresAt, new Date())))

		if (records.length === 0) return res.status(400).send('Invalid or expired token')

		const authUrl = crowdin.buildAuthorizeUrl(token)
		res.redirect(authUrl)
	})

	app.get('/callback/crowdin', async (req: Request, res: Response) => {
		const code = req.query.code as string
		const state = req.query.state as string
		if (!code || !state) return res.status(400).send('Missing code/state')

		if (!inflightStates.has(state)) inflightStates.set(state, 0)
		const now = Date.now()
		const last = inflightStates.get(state)!
		if (now - last < 60_000) return res.status(429).send('Request already in progress')
		inflightStates.set(state, now)

		const [stateRow] = await db
			.select()
			.from(oauthVerifications)
			.where(and(eq(oauthVerifications.token, state), gt(oauthVerifications.expiresAt, new Date())))

		if (!stateRow) return res.status(400).send('Invalid or expired state')

		try {
			const token = await crowdin.exchangeCodeForToken(code)

			const authUser = await crowdin.getCurrentUser(token.access_token)

			const expiresAt = new Date(Date.now() + (token.expires_in ?? 0) * 1000)
			await db
				.insert(crowdinAccounts)
				.values({
					discordUserId: stateRow.discordUserId,
					crowdinUserId: String(authUser.id),
					accessToken: token.access_token,
					refreshToken: token.refresh_token,
					expiresAt,
					organizationDomain: undefined,
				})
				.onConflictDoUpdate({
					target: crowdinAccounts.discordUserId,
					set: {
						crowdinUserId: String(authUser.id),
						accessToken: token.access_token,
						refreshToken: token.refresh_token,
						expiresAt,
					},
				})

			await db
				.insert(users)
				.values({ id: stateRow.discordUserId, crowdinUserId: String(authUser.id) })
				.onConflictDoUpdate({ target: users.id, set: { crowdinUserId: String(authUser.id) } })

			const projectId = process.env.CROWDIN_PROJECT_ID
			let hasContribution = false
			if (projectId) {
				try {
					const serviceToken = process.env.CROWDIN_TOKEN!
					if (!serviceToken) throw new Error('CROWDIN_TOKEN is not set')
					hasContribution = await crowdin.hasContributionViaReport(
						projectId,
						authUser.id,
						serviceToken,
					)
				} catch (e) {
					console.error('[Crowdin][Verify][ERROR]', e)
					hasContribution = false
				}
			}

			if (!client.isReady()) {
				await new Promise<void>((resolve) => client.once('ready', () => resolve()))
			}
			const guild = await client.guilds.fetch(GUILD_ID)
			const member = await guild.members.fetch(stateRow.discordUserId).catch(() => null)
			if (member) {
				if (hasContribution) {
					await member.roles
						.add(TRANSLATOR_ROLE_ID)
						.then(() => {})
						.catch((err) => {
							console.error('[Discord][ERROR] Failed to grant role', err)
						})
				}
				try {
					await member.send(
						hasContribution
							? 'Your Crowdin account is linked and you have contributions. The role has been granted.'
							: 'Your Crowdin account is linked, but we did not detect contributions yet. Contribute and run /verify crowdin again.',
					)
				} catch {}
			}

			await db.delete(oauthVerifications).where(eq(oauthVerifications.token, state))

			res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(htmlClosePage)
		} catch (e: any) {
			console.error('[OAuth][ERROR]', e)
			res.status(500).send(`OAuth failed: ${e?.message ?? 'unknown error'}`)
		} finally {
			setTimeout(() => inflightStates.delete(state), 5_000)
		}
	})

	const server = app.listen(PORT, () => {})

	return server
}

export async function createVerificationState(discordUserId: string) {
	const token = randomBytes(20).toString('hex')
	const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
	await db.insert(oauthVerifications).values({
		token,
		provider: 'crowdin',
		discordUserId,
		expiresAt,
	})
	console.debug('[Verify] Created verification state', {
		discordUserId,
		tokenPreview: token.slice(0, 8),
		expiresAt,
	})
	return token
}
