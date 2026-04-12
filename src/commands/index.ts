import { projectCommand } from '@/commands/project'
import { resetCommand } from '@/commands/reset'
import type { AnyCommand } from '@/types/commands'

import { docsCommand } from './docs'
import { githubCommand } from './github'
import { pingCommand } from './ping'
import { solvedCommand } from './solved'
import { verifyCommand } from './verify'
import { pmCommand } from '@/commands/pm'
import { memberCommand } from '@/commands/member'
import { reportCommand } from '@/commands/report'
import { applyCommand } from '@/commands/apply'
import { assignCommand } from '@/commands/assign'
import { approveCommand } from '@/commands/approve'
import { rejectCommand } from '@/commands/reject'

export const commands: AnyCommand[] = [
	docsCommand,
	githubCommand,
	pingCommand,
	solvedCommand,
	verifyCommand,
	resetCommand,
	projectCommand,
	pmCommand,
	memberCommand,
	// reportCommand,
	applyCommand,
	assignCommand,
	approveCommand,
	rejectCommand,
]

export default commands
