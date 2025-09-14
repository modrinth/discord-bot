import { ModrinthProject } from '@/api/types'

export type ModrinthOAuthToken = {
	access_token: string
	token_type: 'Bearer'
	expires_in: number
}

export class ModrinthOauthHelper {
	private readonly clientId: string
	private readonly clientSecret: string
	private readonly redirectUri: string
	private readonly scopes: string

	constructor(opts: { baseUrl: string; clientId: string; clientSecret: string; scopes?: string }) {
		this.clientId = opts.clientId
		this.clientSecret = opts.clientSecret
		this.redirectUri = `${opts.baseUrl}/callback/modrinth`
		this.scopes = opts.scopes ?? ''
	}

	buildAuthorizeUrl(state: string) {
		const url = new URL('https://modrinth.com/auth/authorize')
		url.searchParams.set('response_type', 'code')
		url.searchParams.set('client_id', this.clientId)
		if (this.scopes) url.searchParams.set('scope', this.scopes)
		url.searchParams.set('state', state)
		url.searchParams.set('redirect_uri', this.redirectUri)
		return url.toString()
	}

	async exchangeCodeForToken(code: string): Promise<ModrinthOAuthToken> {
		const body = new URLSearchParams()
		body.set('code', code)
		body.set('client_id', this.clientId)
		body.set('redirect_uri', this.redirectUri)
		body.set('grant_type', 'authorization_code')
		const res = await fetch('https://api.modrinth.com/_internal/oauth/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				// Docs: place client secret in Authorization header
				Authorization: this.clientSecret,
			},
			body: body.toString(),
		})
		if (!res.ok) {
			const txt = await res.text()
			throw new Error(`Modrinth token exchange failed: ${res.status} ${txt}`)
		}
		return (await res.json()) as ModrinthOAuthToken
	}

	async getCurrentUser(accessToken: string): Promise<{ id: string; username: string }> {
		const res = await fetch('https://api.modrinth.com/v2/user', {
			headers: { Authorization: `Bearer ${accessToken}` },
		})
		if (!res.ok) throw new Error(`Modrinth /user failed: ${res.status}`)
		return (await res.json()) as any
	}
}

export class ModrinthApi {
	private static baseUrl = 'https://api.modrinth.com/v2'

	private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const res = await fetch(`${this.baseUrl}${endpoint}`, options)
		if (!res.ok) {
			const txt = await res.text()
			throw new Error(`Modrinth API ${endpoint} failed: ${res.status} ${txt}`)
		}
		return (await res.json()) as T
	}

	static async getProject(id: string): Promise<ModrinthProject> {
		return this.request<ModrinthProject>(`/project/${id}`)
	}

	static async getUserProjects(idOrUsername: string): Promise<ModrinthProject[]> {
		return this.request<ModrinthProject[]>(`/user/${encodeURIComponent(idOrUsername)}/projects`)
	}
}
