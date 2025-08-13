import { MessageListener } from '../types'
import { greetCommunitySupport } from './forum/greet'
import { lockOnOpDeletesStarter } from './forum/lock-on-op-delete-starter'
import { remindSolvedCreate, remindSolvedUpdate } from './forum/op-solved-reminder'

const listeners: MessageListener[] = [
    greetCommunitySupport,
    remindSolvedCreate,
    remindSolvedUpdate,
    lockOnOpDeletesStarter,
]

export default listeners
