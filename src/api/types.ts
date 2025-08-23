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
	project_type: string
}

export interface ModrinthUser {
	id: string
	username: string
	name: string
}
