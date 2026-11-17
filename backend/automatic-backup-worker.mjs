import { workerData } from 'node:worker_threads';
import { automaticBackup } from './automatic-backup.mjs';

automaticBackup(workerData);
