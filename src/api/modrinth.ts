import { ModrinthProject } from '@/api/types'

export class ModrinthApi {
	private static baseUrl = 'https://api.modrinth.com/v2'

	private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const res = await fetch(`${this.baseUrl}${endpoint}`)

		if (!res.ok) {
		}
		return (await res.json()) as T
	}

	static async getProject(id: string): Promise<ModrinthProject> {
		return this.request<ModrinthProject>(`/project/${id}`)
	}
}
