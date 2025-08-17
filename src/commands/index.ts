import type { AnyCommand } from '@/types/commands'

import { docsCommand } from './docs'
import { githubCommand } from './github'
import { pingCommand } from './ping'
import { solvedCommand } from './solved'

export const commands: AnyCommand[] = [docsCommand, githubCommand, pingCommand, solvedCommand]

export default commands
