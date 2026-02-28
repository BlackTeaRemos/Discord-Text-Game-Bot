/**
 * Grouping entity with optional parent hierarchy for nested permission scoping
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
     * UID of the parent organization for hierarchy traversal or null for root
     * @example 'org_parent456'
     */
    parentUid: UID | null;
}

/**
 * View representation of an organization with hierarchy chain
 */
export interface OrganizationView {
    uid: UID;
    name: string;
    friendlyName: string;
    parentUid: UID | null;
    hierarchyChain: UID[];
}

/**
 * Organization with members for permission resolution
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
