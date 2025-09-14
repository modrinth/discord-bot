export interface ModrinthProject {
	id: string
	slug: string
	title: string
	description: string
	categories: string[]
	issues_url: string
	source_url: string
	discord_url: string
	wiki_url: string
	icon_url: string
	color: number
	project_type: 'mod' | 'plugin' | 'datapack' | 'modpack' | 'resourcepack' | 'shader'
	downloads?: number
}

export interface ModrinthUser {
	id: string
	username: string
	name: string
}
