import { checkIfModrinthProduct } from '@/listeners/forum/check-if-modrinth-product'

import { MessageListener } from '../types'
import { greetCommunitySupport } from './forum/greet'
import { lockOnOpDeletesStarter } from './forum/lock-on-op-delete-starter'
import { remindSolvedCreate, remindSolvedUpdate } from './forum/solved-reminder'
import { countMessages } from '@/listeners/global/count-messages'
import { scanForBlocklistedFiles } from '@/listeners/global/scan-for-blocklisted-files'
import { enforceNamePolicy } from '@/listeners/global/enforce-name-policy'

const listeners: MessageListener[] = [
	greetCommunitySupport,
	remindSolvedCreate,
	remindSolvedUpdate,
	lockOnOpDeletesStarter,
	checkIfModrinthProduct,
	countMessages,
	scanForBlocklistedFiles,
	enforceNamePolicy,
]

export default listeners
