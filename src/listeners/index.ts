import { MessageListener } from '../types'
import { greetCommunitySupport } from './forum/greet'
import { lockOnOpDeletesStarter } from './forum/lock-on-op-delete-starter'
import { remindSolvedCreate, remindSolvedUpdate } from './forum/solved-reminder'
import {checkIfModrinthProduct} from "@/listeners/forum/check-if-modrinth-product";

const listeners: MessageListener[] = [
    greetCommunitySupport,
    remindSolvedCreate,
    remindSolvedUpdate,
    lockOnOpDeletesStarter,
    checkIfModrinthProduct,
]

export default listeners
