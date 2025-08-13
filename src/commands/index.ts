import type { AnyCommand } from '@/types/commands'

import { pingCommand } from './ping'
import { solvedCommand } from './solved'

export const commands: AnyCommand[] = [pingCommand, solvedCommand]

export default commands
