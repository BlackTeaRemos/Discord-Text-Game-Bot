import type { TaskListItem } from '../../../Domain/Task.js';

export interface TaskViewPage {
    pageIndex: number;
    pageSize: number;
    totalPages: number;
    items: TaskListItem[];
}

/**
 * Slice a task list into a stable page.
 * @param tasks TaskListItem[] Full task list. @example []
 * @param pageIndex number Requested index. @example 0
 * @param pageSize number Items per page. @example 10
 * @returns TaskViewPage Page result with normalized index. @example SliceTaskViewPage(tasks,0,10)
 */
export function SliceTaskViewPage(
    tasks: TaskListItem[],
    pageIndex: number,
    pageSize: number,
): TaskViewPage {
    const safePageSize = Math.min(Math.max(Math.floor(pageSize || 10), 1), 25);
    const totalPages = Math.max(Math.ceil(tasks.length / safePageSize), 1);
    const clampedIndex = Math.min(Math.max(Math.floor(pageIndex || 0), 0), totalPages - 1);
    const start = clampedIndex * safePageSize;
    const end = start + safePageSize;
    return {
        pageIndex: clampedIndex,
        pageSize: safePageSize,
        totalPages,
        items: tasks.slice(start, end),
    };
}
