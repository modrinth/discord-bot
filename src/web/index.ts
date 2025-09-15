import { randomBytes } from 'node:crypto'

import type { Client } from 'discord.js'
import { and, eq, gt, sql } from 'drizzle-orm'
import express, { NextFunction, Request, Response } from 'express'

import { CrowdinOauthHelper, ModrinthApi, ModrinthOauthHelper } from '@/api/'
import { db } from '@/db'
import { crowdinAccounts, oauthVerifications, users } from '@/db/schema'
import { createDefaultEmbed } from '@/utils/embeds'

import htmlClosePage from './close.html?raw'

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000
const BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:3000'
const GUILD_ID = process.env.GUILD_ID!
const TRANSLATOR_ROLE_ID = process.env.TRANSLATOR_ROLE_ID || process.env.ACTIVE_ROLE_ID!
const CROWDIN_SCOPES = 'project'
const VERIFIED_CREATOR_ROLE_ID = process.env.VERIFIED_CREATOR_ROLE_ID || ''
const PROOFREADER_ROLE_ID = process.env.PROOFREADER_ROLE_ID || ''

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

	app.get(
		'/healthz',
		(req: Request, res: Response, next: NextFunction) => {
			let ip = req.ip || ''
			if (ip.startsWith('::ffff:')) ip = ip.slice(7)
			if (ip === '::1' || ip.startsWith('172.16')) return next()
			return res.status(403).send()
		},
		async (_req: Request, res: Response) => {
			try {
				await db.execute(sql`select 1`)
				res.status(200).send()
			} catch (err) {
				console.error('[Healthz][DB][ERROR]', err)
				res.status(503).send()
			}
		},
	)

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
		const last = inflightStates.get(state) ?? 0
		if (last !== 0 && now - last < 60_000)
			return res.status(429).send('Request already in progress')
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
				let creatorGranted = false
				if (totalWeighted >= threshold && VERIFIED_CREATOR_ROLE_ID) {
					try {
						await member.roles.add(VERIFIED_CREATOR_ROLE_ID)
						creatorGranted = true
					} catch (err) {
						console.error('[Discord][ERROR] Failed to grant creator role', err)
					}
				}
				try {
					const fmt = (n: number) => Math.floor(n).toLocaleString()
					const embed = createDefaultEmbed()
						.setTitle('Modrinth account linked')
						.setDescription(
							creatorGranted
								? 'You meet the requirements for the Creator role.'
								: 'Your account has been linked, but you do not meet the current threshold yet. You will receive an email when you do.',
						)
					await member.send({ embeds: [embed] })
				} catch {
					// ignore
				}
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
		const last = inflightStates.get(state) ?? 0
		if (last !== 0 && now - last < 60_000)
			return res.status(429).send('Request already in progress')
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
			let isProofreader = false
			let translated = 0
			let approved = 0
			if (projectId) {
				const serviceToken = process.env.CROWDIN_TOKEN!
				if (!serviceToken) {
					console.error('[Crowdin][Verify][ERROR] CROWDIN_TOKEN is not set')
				} else {
					try {
						const activity = await crowdin.getMemberActivity(projectId, authUser.id, serviceToken)
						translated = activity.translated
						approved = activity.approved
						hasContribution = translated > 0 || approved > 0

						// Check proofreader role separately
						try {
							isProofreader = await crowdin.hasProofreaderRole(projectId, authUser.id, serviceToken)
						} catch (err) {
							console.error('[Crowdin][Verify][ERROR] hasProofreaderRole failed', err)
							// Fallback: if they have approved translations, they're likely a proofreader
							isProofreader = approved > 0
						}
					} catch (e) {
						console.error('[Crowdin][Verify][ERROR] getMemberActivity failed', e)
						// Keep defaults: translated = 0, approved = 0, hasContribution = false
					}
				}
			}
			console.debug('[Crowdin][Verify]', {
				userId: String(authUser.id),
				translated,
				approved,
				hasContribution,
				isProofreader,
			})

			if (!client.isReady()) {
				await new Promise<void>((resolve) => client.once('ready', () => resolve()))
			}
			const guild = await client.guilds.fetch(GUILD_ID)
			const member = await guild.members.fetch(stateRow.discordUserId).catch(() => null)
			if (!member) {
				console.warn(
					`[Discord] Member ${stateRow.discordUserId} not found in guild ${GUILD_ID}; cannot grant roles`,
				)
			}
			if (member) {
				const hasTranslatorRole = member.roles.cache.has(TRANSLATOR_ROLE_ID)
				const hasProofreaderRole = PROOFREADER_ROLE_ID
					? member.roles.cache.has(PROOFREADER_ROLE_ID)
					: false

				const newlyGranted: string[] = []
				const alreadyHad: string[] = []

				// Ensure translator role if the user has contributions
				if (hasContribution) {
					if (!hasTranslatorRole) {
						try {
							await member.roles.add(TRANSLATOR_ROLE_ID)
							newlyGranted.push('Translator')
						} catch (err) {
							console.error('[Discord][ERROR] Failed to grant translator role', err)
						}
					} else {
						alreadyHad.push('Translator')
					}
				} else if (hasTranslatorRole) {
					// User already has Translator from before
					alreadyHad.push('Translator')
				}

				// Ensure proofreader role if detected on Crowdin
				if (isProofreader) {
					if (PROOFREADER_ROLE_ID) {
						if (!hasProofreaderRole) {
							try {
								await member.roles.add(PROOFREADER_ROLE_ID)
								newlyGranted.push('Proofreader')
							} catch (err) {
								console.error('[Discord][ERROR] Failed to grant proofreader role', err)
							}
						} else {
							alreadyHad.push('Proofreader')
						}
					} else {
						// Detected proofreader, but role id is not configured
						if (!PROOFREADER_ROLE_ID) {
							console.warn(
								'[Discord] PROOFREADER_ROLE_ID is not configured; cannot grant proofreader role',
							)
						}
					}
				}

				try {
					const base = createDefaultEmbed().setTitle('Crowdin account linked')
					const activityField = {
						name: 'Your activity',
						value: `Translated: ${translated}\nApproved: ${approved}`,
						inline: false,
					}
					if (newlyGranted.length > 0) {
						const embed = base
							.setDescription('Thanks for contributing! We granted you new role(s).')
							.addFields(
								{ name: 'Granted roles', value: newlyGranted.join(', '), inline: true },
								...(alreadyHad.length > 0
									? [{ name: 'Already had', value: alreadyHad.join(', '), inline: true }]
									: []),
								activityField,
							)
						await member.send({ embeds: [embed] })
					} else if (alreadyHad.length > 0) {
						const embed = base
							.setDescription(
								'Your Crowdin account is linked. You already have the following role(s).',
							)
							.addFields(
								{ name: 'Roles', value: alreadyHad.join(', '), inline: true },
								activityField,
							)
						await member.send({ embeds: [embed] })
					} else if (isProofreader && !PROOFREADER_ROLE_ID) {
						const embed = base
							.setDescription(
								"We detected you're a proofreader, but the server hasn't configured the Proofreader role yet. Please contact the staff.",
							)
							.addFields(activityField)
						await member.send({ embeds: [embed] })
					} else {
						const embed = base
							.setDescription(
								'We did not detect contributions yet. Try contributing (translating or approving) and then run /verify crowdin again.',
							)
							.addFields(activityField)
						await member.send({ embeds: [embed] })
					}
				} catch {
					// ignore
				}
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
