/**
 * Organization represents a grouping entity that users can belong to.
 * Organizations can form hierarchies via parentUid allowing nested permission scoping.
 * @example
 * const org: Organization = {
 *   uid: 'org_abc123',
 *   name: '3rd_division',
 *   friendly_name: '3rd Division',
 *   id: 'neo4j-id',
 *   parentUid: 'org_parent456'
 * };
 */
import type { DBObject } from '../Object/Object.js';
import type { UID } from '../Common/Ids.js';

export interface Organization extends DBObject {
    /**
     * UID of the parent organization for hierarchy traversal.
     * Null indicates a root organization.
     * @example 'org_parent456'
     */
    parentUid: UID | null;
}

/**
 * View representation of an organization with hierarchy chain.
 * @property uid Organization unique identifier.
 * @property name Canonical organization name.
 * @property friendlyName Human readable label.
 * @property parentUid Parent organization UID if any.
 * @property hierarchyChain Ordered list from root to this organization.
 */
export interface OrganizationView {
    uid: UID;
    name: string;
    friendlyName: string;
    parentUid: UID | null;
    hierarchyChain: UID[];
}

/**
 * Organization with members for permission resolution.
 * @property organization Core organization data.
 * @property users List of users belonging to this organization.
 */
export interface OrganizationWithMembers {
    organization: OrganizationView;
    users: Array<{
        uid: UID;
        discordId: string;
        name: string;
        friendlyName: string;
    }>;
}
