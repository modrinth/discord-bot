import { checkIfModrinthProduct } from '@/listeners/forum/check-if-modrinth-product'
import { countMessages } from '@/listeners/global/count-messages'
import { enforceNamePolicy } from '@/listeners/global/enforce-name-policy'
import { scanForBlocklistedFiles } from '@/listeners/global/scan-for-blocklisted-files'

import { MessageListener } from '../types'
import { greetCommunitySupport } from './forum/greet'
import { lockOnOpDeletesStarter } from './forum/lock-on-op-delete-starter'
import { remindSolvedCreate, remindSolvedUpdate } from './forum/solved-reminder'
import { scanForRawLogs } from '@/listeners/global/scan-for-raw-logs'
import { analyzeLogs } from '@/listeners/forum/analyze-logs'

const listeners: MessageListener[] = [
	greetCommunitySupport,
	remindSolvedCreate,
	remindSolvedUpdate,
	lockOnOpDeletesStarter,
	checkIfModrinthProduct,
	countMessages,
	scanForBlocklistedFiles,
	enforceNamePolicy,
	scanForRawLogs,
	analyzeLogs,
]

export default listeners
