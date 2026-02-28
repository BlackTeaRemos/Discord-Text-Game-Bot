import type { PermissionsObject } from '../../../../Common/Permission/Types.js';

/**
 * Scope visibility levels for descriptions.
 * @value 'global' Visible to all users viewing the object.
 * @value 'organization' Visible only to members of the specified organization.
 * @value 'user' Visible only to the specific user who created it.
 */
export type DescriptionScopeType = `global` | `organization` | `user`;

/**
 * Identifies a specific scope for a description.
 * @property scopeType DescriptionScopeType The visibility level. @example 'organization'
 * @property scopeUid string | null The uid of org or user. Null for global scope. @example 'org_abc123'
 * @property label string Human-readable name for display. @example 'Military Alpha Notes'
 */
export interface DescriptionScope {
    scopeType: DescriptionScopeType;
    scopeUid: string | null;
    label: string;
}

/**
 * Reference to the object being described.
 * @property objectType string Category of the target object. @example 'vehicle'
 * @property objectUid string Unique identifier of the target object. @example 'vehicle_123'
 */
export interface DescriptionObjectReference {
    objectType: string;
    objectUid: string;
}

/**
 * Runtime state for the description editor flow.
 * @property objectReference DescriptionObjectReference Target object being described.
 * @property availableScopes DescriptionScope[] Scopes the user can access.
 * @property selectedScope DescriptionScope | null Currently selected scope for viewing/editing.
 * @property currentContent string The description text for selected scope.
 * @property currentPage number Zero-based page index for paginated preview.
 * @property totalPages number Total pages for current content.
 * @property isEditing boolean True when user is actively modifying content.
 * @property canEditGlobal boolean True if user has permission to modify global description.
 * @property userUid string Discord user id of the viewer/editor.
 * @property organizationUid string | null Organization uid if user belongs to one.
 * @property permissions PermissionsObject | undefined User permission configuration for scope filtering.
 */
export interface DescriptionFlowState {
    objectReference: DescriptionObjectReference;
    availableScopes: DescriptionScope[];
    selectedScope: DescriptionScope | null;
    currentContent: string;
    currentPage: number;
    totalPages: number;
    isEditing: boolean;
    canEditGlobal: boolean;
    userUid: string;
    organizationUid: string | null;
    permissions?: PermissionsObject;
}

/**
 * Options passed when invoking the description editor flow.
 * @property objectType string Category of the target object. @example 'vehicle'
 * @property objectUid string Unique identifier of the target object. @example 'vehicle_123'
 * @property userUid string Discord user id invoking the flow. @example '123456789012345678'
 * @property organizationUid string | null Organization uid if user is member. @example 'org_abc'
 * @property canEditGlobal boolean Whether user can modify global description. @example false
 * @property permissions PermissionsObject | undefined User's permission configuration for filtering scopes.
 */
export interface DescriptionEditorFlowOptions {
    objectType: string;
    objectUid: string;
    userUid: string;
    organizationUid: string | null;
    canEditGlobal: boolean;
    permissions?: PermissionsObject;
}

/**
 * Persisted scoped description record.
 * @property uid string Unique description identifier. @example 'desc_abc123'
 * @property objectType string Category of described object. @example 'vehicle'
 * @property objectUid string Identifier of described object. @example 'vehicle_123'
 * @property scopeType DescriptionScopeType Visibility level. @example 'organization'
 * @property scopeUid string | null Scope owner uid. @example 'org_abc'
 * @property content string Description text. @example 'Heavy armored transport...'
 * @property version number Version number for tracking changes. @example 3
 * @property createdBy string Discord user id who created this version. @example '123456789'
 * @property createdAt string ISO timestamp of creation. @example '2025-11-30T12:00:00.000Z'
 */
export interface ScopedDescription {
    uid: string;
    objectType: string;
    objectUid: string;
    scopeType: DescriptionScopeType;
    scopeUid: string | null;
    content: string;
    version: number;
    createdBy: string;
    createdAt: string;
}

/**
 * Maximum characters per page in paginated preview.
 */
export const DESCRIPTION_PAGE_SIZE = 2800;

/**
 * Calculate total pages for given content.
 * @param content string The full description text.
 * @returns number Total page count, minimum 1.
 */
export function CalculatePageCount(content: string): number {
    if (!content || content.length === 0) {
        return 1;
    }
    return Math.ceil(content.length / DESCRIPTION_PAGE_SIZE);
}

/**
 * Extract page content from full description.
 * @param content string The full description text.
 * @param pageIndex number Zero-based page index.
 * @returns string Content slice for requested page.
 */
export function GetPageContent(content: string, pageIndex: number): string {
    const startIndex = pageIndex * DESCRIPTION_PAGE_SIZE;
    const endIndex = startIndex + DESCRIPTION_PAGE_SIZE;
    return content.slice(startIndex, endIndex);
}
