import type { UID } from '../../../../Repository/Common/Ids.js';

/**
 * Result of circular dependency check.
 * @property valid Whether the hierarchy change would be valid.
 * @property reason Explanation when invalid.
 * @property chain Hierarchy path if circular dependency detected.
 */
export interface CircularDependencyCheckResult {
    valid: boolean;
    reason?: string;
    chain?: UID[];
}

/**
 * Result of parent assignment operation.
 * @property success Whether the operation completed successfully.
 * @property error Error message when failed.
 */
export interface SetParentResult {
    success: boolean;
    error?: string;
}

/**
 * Result of hierarchy integrity validation.
 * @property valid Whether the hierarchy is consistent.
 * @property issues Descriptions of any validation issues found.
 */
export interface HierarchyIntegrityResult {
    valid: boolean;
    issues: string[];
}
