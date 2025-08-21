import type { AnyCommand } from '@/types/commands'

import { docsCommand } from './docs'
import { githubCommand } from './github'
import { pingCommand } from './ping'
import { solvedCommand } from './solved'
import { verifyCommand } from './verify'

export const commands: AnyCommand[] = [
	docsCommand,
	githubCommand,
	pingCommand,
	solvedCommand,
	verifyCommand,
]

export default commands
