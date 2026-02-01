import type { UID } from '../../../../Repository/Common/Ids.js';

/**
 * Result of resolving execution organization.
 * @property scopeType Scope type used for execution.
 * @property organizationUid Selected organization UID or null for user scope.
 * @property organizationName Display name for reporting execution scope.
 * @property source Selection source.
 */
export interface ExecutionOrganizationResult {
    scopeType: `organization` | `user`;
    organizationUid: UID | null;
    organizationName: string;
    source: `requested` | `default` | `fallback` | `none`;
}

/**
 * Result of default organization update operation.
 * @property organizationUid Selected default organization UID or null.
 * @property updated Whether the default was changed.
 */
export interface DefaultOrganizationResult {
    organizationUid: UID | null;
    updated: boolean;
}
