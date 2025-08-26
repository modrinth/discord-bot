import { db } from '@/db'
import { crowdinAccounts, oauthVerifications, users } from '@/db/schema'
import type { Client } from 'discord.js'
import { and, eq, gt } from 'drizzle-orm'
import express, { Request, Response } from 'express'
import { randomBytes } from 'node:crypto'
import { writeFileSync } from 'node:fs'

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000
const BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:3000'
const GUILD_ID = process.env.GUILD_ID!
const TRANSLATOR_ROLE_ID = process.env.TRANSLATOR_ROLE_ID || process.env.ACTIVE_ROLE_ID!
const CROWDIN_SCOPES = 'project'

// Simple helper to mask sensitive tokens in logs
function maskToken(token?: string) {
	if (!token) return '(none)'
	try {
		if (token.length <= 10) return token[0] + '***' + token[token.length - 1]
		return `${token.slice(0, 6)}...${token.slice(-4)}`
	} catch {
		return '(masked)'
	}
}

function buildCrowdinAuthorizeUrl(state: string) {
	const clientId = process.env.CROWDIN_CLIENT_ID!
	const redirectUri = `${BASE_URL}/callback/crowdin`
	// Request minimal valid scope required for reports API
	const scope = CROWDIN_SCOPES

	console.debug('[Crowdin][Auth] Building authorize URL', {
		clientIdSuffix: clientId ? clientId.slice(-4) : '(none)',
		redirectUri,
		scope,
		statePreview: state.slice(0, 8),
	})

	const url = new URL('https://accounts.crowdin.com/oauth/authorize')
	url.searchParams.set('client_id', clientId)
	url.searchParams.set('response_type', 'code')
	url.searchParams.set('scope', scope)
	url.searchParams.set('state', state)
	url.searchParams.set('redirect_uri', redirectUri)
	return url.toString()
}

type CrowdinOAuthToken = {
	token_type: string
	access_token: string
	refresh_token?: string
	expires_in: number
}

async function exchangeCrowdinCode(code: string): Promise<CrowdinOAuthToken> {
	const clientId = process.env.CROWDIN_CLIENT_ID!
	const clientSecret = process.env.CROWDIN_CLIENT_SECRET!
	const redirectUri = `${BASE_URL}/callback/crowdin`

	console.info('[Crowdin][OAuth] Exchanging code for token', {
		clientIdSuffix: clientId ? clientId.slice(-4) : '(none)',
		redirectUri,
		codePresent: Boolean(code),
	})

	const res = await fetch('https://accounts.crowdin.com/oauth/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			grant_type: 'authorization_code',
			client_id: clientId,
			client_secret: clientSecret,
			redirect_uri: redirectUri,
			code,
		}),
	})
	if (!res.ok) {
		const body = await res.text()
		console.error('[Crowdin][OAuth][ERROR] Token exchange failed', {
			status: res.status,
			statusText: res.statusText,
			body,
		})
		throw new Error(`Crowdin token exchange failed: ${res.status} ${body}`)
	}
	return (await res.json()) as CrowdinOAuthToken
}

const CROWDIN_API_BASE = 'https://api.crowdin.com/api/v2'

async function crowdinGet<T>(endpoint: string, accessToken: string): Promise<T> {
	const url = `${CROWDIN_API_BASE}${endpoint}`
	console.debug('[Crowdin][GET] Request', { url, token: maskToken(accessToken) })
	const res = await fetch(url, {
		headers: { Authorization: `Bearer ${accessToken}` },
	})
	console.debug('[Crowdin][GET] Response', {
		url,
		status: res.status,
		statusText: res.statusText,
		contentType: res.headers.get('content-type'),
	})
	if (!res.ok) {
		const body = await res.text()
		console.error('[Crowdin][GET][ERROR]', { url, status: res.status, body })
		throw new Error(`Crowdin API error ${res.status} at GET ${endpoint}: ${body}`)
	}
	return (await res.json()) as T
}

async function crowdinPost<T>(endpoint: string, accessToken: string, body: any): Promise<T> {
	const url = `${CROWDIN_API_BASE}${endpoint}`
	console.debug('[Crowdin][POST] Request', {
		url,
		token: maskToken(accessToken),
		body,
	})
	const res = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(body),
	})
	console.debug('[Crowdin][POST] Response', {
		url,
		status: res.status,
		statusText: res.statusText,
		contentType: res.headers.get('content-type'),
	})
	if (!res.ok) {
		const respBody = await res.text()
		console.error('[Crowdin][POST][ERROR]', { url, status: res.status, body: respBody })
		throw new Error(`Crowdin API error ${res.status} at POST ${endpoint}: ${respBody}`)
	}
	return (await res.json()) as T
}

type ReportCreate = { data: { identifier?: string } }
type ReportStatus = { data: { status: 'created' | 'inProgress' | 'finished' | 'failed' } }
type ReportDownload = { data: { url: string } }

async function generateTopMembersReport(
	projectId: string | number,
	accessToken: string,
): Promise<string> {
	console.info('[Crowdin][Report] Generating Top Members report', { projectId })
	const create = await crowdinPost<ReportCreate>(`/projects/${projectId}/reports`, accessToken, {
		name: 'top-members',
		schema: {
			unit: 'strings',
			format: 'json',
			dateFrom: new Date(0).toISOString(),
			dateTo: new Date().toISOString(),
		},
	})
	const reportId = create.data.identifier
	console.debug('[Crowdin][Report] Created', { reportId, raw: create })
	for (let i = 0; i < 30; i++) {
		await new Promise((r) => setTimeout(r, 1000))
		const status = await crowdinGet<ReportStatus>(
			`/projects/${projectId}/reports/${reportId}`,
			accessToken,
		)
		console.debug('[Crowdin][Report] Status', {
			reportId,
			attempt: i + 1,
			status: status.data.status,
		})
		if (status.data.status === 'finished') break
		if (status.data.status === 'failed') throw new Error('Report generation failed')
		if (i === 29) throw new Error('Report generation timed out')
	}
	const dl = await crowdinGet<ReportDownload>(
		`/projects/${projectId}/reports/${reportId}/download`,
		accessToken,
	)
	console.info('[Crowdin][Report] Download URL ready', {
		reportId,
		urlSuffix: dl.data.url.slice(-16),
	})
	return dl.data.url
}

async function hasContributionViaReport(
	projectId: string | number,
	userId: number,
	accessToken: string,
): Promise<boolean> {
	const url = await generateTopMembersReport(projectId, accessToken)
	console.info('[Crowdin][Report] Fetching report data', { urlPreview: url.slice(0, 60) + '...' })
	const res = await fetch(url)
	const ct = res.headers.get('content-type') || ''
	console.debug('[Crowdin][Report] Download response', { status: res.status, contentType: ct })
	if (ct.includes('application/json')) {
		const data = await res.json().catch(() => null)
		writeFileSync('output-temp.json', JSON.stringify(data, null, 2))
		if (!data) return false
		const rows: any[] = Array.isArray(data?.data)
			? data.data
			: Array.isArray(data?.rows)
				? data.rows
				: Array.isArray(data)
					? data
					: []
		console.debug('[Crowdin][Report] Parsed JSON rows', { count: rows.length })
		const found = rows.find((row) => {
			console.log(`Row ID: ${row.user.id} Looking for: ${userId}`)
			return String(row.user.id) === String(userId)
		})
		if (found) {
			console.info('[Crowdin][Report] Contribution found', {
				userId,
				translated: found.translated,
				approved: found.approved,
			})
			return true
		}
		const asString = JSON.stringify(data)
		console.debug('[Crowdin][Report] Fallback JSON string search for userId')
		return new RegExp(`"id"\\s*:\\s*${userId}`).test(asString)
	} else {
		const txt = await res.text()
		console.debug('[Crowdin][Report] CSV/text length', { length: txt.length })
		return new RegExp(`(^|\\D)${userId}(\\D|$)`).test(txt)
	}
}

export function startWebServer(client: Client) {
	const app = express()
	app.use(express.json())

	app.get('/healthz', (_req: Request, res: Response) => res.send('ok'))

	app.get('/crowdin/verify', async (req: Request, res: Response) => {
		const token = (req.query.token as string) || ''
		if (!token) return res.status(400).send('Missing token')

		console.info('[Verify] /crowdin/verify hit', { tokenPreview: token.slice(0, 8) })

		const records = await db
			.select()
			.from(oauthVerifications)
			.where(and(eq(oauthVerifications.token, token), gt(oauthVerifications.expiresAt, new Date())))

		if (records.length === 0) return res.status(400).send('Invalid or expired token')

		const authUrl = buildCrowdinAuthorizeUrl(token)
		console.debug('[Verify] Redirecting to Crowdin authorize', {
			authUrlPreview: authUrl.slice(0, 80) + '...',
		})
		res.redirect(authUrl)
	})

	app.get('/callback/crowdin', async (req: Request, res: Response) => {
		const code = req.query.code as string
		const state = req.query.state as string
		if (!code || !state) return res.status(400).send('Missing code/state')

		console.info('[OAuth] /callback/crowdin hit', {
			statePreview: state.slice(0, 8),
			codePresent: Boolean(code),
		})

		// Validate state
		const [stateRow] = await db
			.select()
			.from(oauthVerifications)
			.where(and(eq(oauthVerifications.token, state), gt(oauthVerifications.expiresAt, new Date())))

		if (!stateRow) return res.status(400).send('Invalid or expired state')

		console.debug('[OAuth] State validated', { discordUserId: stateRow.discordUserId })

		try {
			const token = await exchangeCrowdinCode(code)
			console.info('[OAuth] Token received', {
				expiresInSec: token.expires_in,
				hasRefresh: Boolean(token.refresh_token),
			})

			// Identify the user via REST (public Crowdin API)
			const userRes = await crowdinGet<{ data: { id: number } }>(`/user`, token.access_token)
			const authUser = userRes.data
			console.info('[Crowdin] Authenticated user', { userId: authUser?.id })

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
					console.info('[Crowdin][Verify] Checking contributions via report', {
						projectId,
						serviceToken: maskToken(serviceToken),
						userId: authUser.id,
					})
					if (!serviceToken) throw new Error('CROWDIN_TOKEN is not set')
					hasContribution = await hasContributionViaReport(projectId, authUser.id, serviceToken)
					console.info('[Crowdin][Verify] Contribution check result', { hasContribution })
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
						.then(() => {
							console.info('[Discord] Role granted', {
								userId: member.id,
								roleId: TRANSLATOR_ROLE_ID,
							})
						})
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
					console.debug('[Discord] DM sent to user', { userId: member.id })
				} catch {}
			}

			await db.delete(oauthVerifications).where(eq(oauthVerifications.token, state))
			console.debug('[OAuth] State token consumed and deleted', { statePreview: state.slice(0, 8) })

			res
				.status(200)
				.send(hasContribution ? 'You can close this window.' : 'You can close this window.')
		} catch (e: any) {
			console.error('[OAuth][ERROR]', e)
			res.status(500).send(`OAuth failed: ${e?.message ?? 'unknown error'}`)
		}
	})

	const server = app.listen(PORT, () => {
		console.log(`[Web] Server listening`, { port: PORT, baseUrl: BASE_URL })
	})

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
