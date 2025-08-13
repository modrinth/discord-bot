import { MessageListener } from '../types';
import { greetCommunitySupport } from './forum/greet';
import { remindSolvedCreate, remindSolvedUpdate } from './forum/op-solved-reminder';
import { lockOnOpDeletesStarter } from './forum/lock-on-op-delete-starter';

const listeners: MessageListener[] = [
  greetCommunitySupport,
  remindSolvedCreate,
  remindSolvedUpdate,
  lockOnOpDeletesStarter,
];

export default listeners;
