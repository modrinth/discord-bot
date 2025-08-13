import type { AnyCommand } from '@/types/commands'

import { pingCommand } from './ping'

export const commands: AnyCommand[] = [pingCommand]

export default commands
