import { projectCommand } from '@/commands/project'
import { resetCommand } from '@/commands/reset'
import type { AnyCommand } from '@/types/commands'

import { docsCommand } from './docs'
import { githubCommand } from './github'
import { pingCommand } from './ping'
import { solvedCommand } from './solved'
import { verifyCommand } from './verify'
import { pmCommand } from '@/commands/pm'

export const commands: AnyCommand[] = [
	docsCommand,
	githubCommand,
	pingCommand,
	solvedCommand,
	verifyCommand,
	resetCommand,
	projectCommand,
	pmCommand,
]

export default commands
