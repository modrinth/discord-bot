import type { AnyCommand } from '@/types/commands'

import { docsCommand } from './docs'
import { githubCommand } from './github'
import { pingCommand } from './ping'
import { solvedCommand } from './solved'
import { verifyCommand } from './verify'
import { resetCommand } from '@/commands/reset'
import { projectCommand } from '@/commands/project'

export const commands: AnyCommand[] = [
	docsCommand,
	githubCommand,
	pingCommand,
	solvedCommand,
	verifyCommand,
	resetCommand,
	projectCommand,
]

export default commands
