import type { TaskStatus } from '../../../Domain/Task.js';

export const TASK_LABEL = `Task`;
export const REL_BELONGS_TO = `BELONGS_TO`;
export const REL_CREATED_TASK = `CREATED_TASK`;
export const REL_EXECUTES_TASK = `EXECUTES_TASK`;
export const REL_RELATES_TO = `RELATES_TO`;
export const REL_PART_OF_GAME = `PART_OF_GAME`;
export const DEFAULT_TASK_STATUS: TaskStatus = `incomplete`;
