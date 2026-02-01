import { randomUUID } from 'crypto';
import { neo4jClient } from '../../../Setup/Neo4j.js';
import { log } from '../../../Common/Log.js';
import type { UID } from '../../../Repository/Common/Ids.js';
import type { OrganizationView } from '../../../Repository/Organization/Organization.js';
import { CheckCircularDependency } from './Hierarchy/index.js';
import { AddCreatorAsOrganizationMember } from './Membership.js';

/**
 * Options for creating a new organization.
 * @property name Canonical organization name used in permission tokens.
 * @property friendlyName Human readable label for display.
 * @property parentUid Optional parent organization UID for hierarchy.
 * @property createdByDiscordId Discord ID of the user creating the organization.
 */
export interface OrganizationCreateOptions {
    name: string;
    friendlyName?: string;
    parentUid?: UID | null;
    createdByDiscordId: string;
}

/**
 * Result of organization creation operation.
 * @property success Whether the operation completed successfully.
 * @property organization Created organization data when successful.
 * @property error Error message when failed.
 */
export interface OrganizationCreateResult {
    success: boolean;
    organization?: OrganizationView;
    error?: string;
}

/**
 * Generate a unique organization UID with prefix.
 * @param prefix UID prefix string. @example 'org'
 * @returns Generated UID string. @example 'org_a1b2c3d4e5f6'
 */
export function GenerateOrganizationUid(prefix: string = `org`): string {
    const uniquePart = randomUUID().replace(/-/g, ``);
    return `${prefix}_${uniquePart}`;
}

/**
 * Create a new organization in the database.
 * Validates parent relationship does not create circular dependency.
 * @param options OrganizationCreateOptions Creation parameters.
 * @returns Promise<OrganizationCreateResult> Operation result with created organization.
 * @example
 * const result = await CreateOrganization({
 *   name: '3rd_division',
 *   friendlyName: '3rd Division',
 *   parentUid: 'org_parent123',
 *   createdByDiscordId: '123456789'
 * });
 */
export async function CreateOrganization(options: OrganizationCreateOptions): Promise<OrganizationCreateResult> {
    const { name, friendlyName, parentUid, createdByDiscordId } = options;
    const normalizedName = name.toLowerCase().replace(/\s+/g, `_`);
    const displayName = friendlyName ?? name;

    log.info(
        `Creating organization: ${normalizedName}`,
        `OrganizationCreate`,
        `parentUid=${parentUid ?? `none`} createdBy=${createdByDiscordId}`,
    );

    if (parentUid) {
        const circularCheck = await CheckCircularDependency(parentUid, null);
        if (!circularCheck.valid) {
            return {
                success: false,
                error: `Invalid parent organization: ${circularCheck.reason}`,
            };
        }
    }

    const session = await neo4jClient.GetSession(`WRITE`);
    try {
        const organizationUid = GenerateOrganizationUid();
        const createdAt = Date.now();

        const query = `
            MERGE (o:Organization { name: $name })
            ON CREATE SET 
                o.uid = $uid,
                o.friendly_name = $friendlyName,
                o.parentUid = $parentUid,
                o.createdAt = $createdAt,
                o.createdBy = $createdBy
            ON MATCH SET 
                o.friendly_name = coalesce($friendlyName, o.friendly_name)
            RETURN o
        `;

        const result = await session.run(query, {
            uid: organizationUid,
            name: normalizedName,
            friendlyName: displayName,
            parentUid: parentUid ?? null,
            createdAt,
            createdBy: createdByDiscordId,
        });

        const record = result.records[0];
        if (!record) {
            return { success: false, error: `Failed to create organization record` };
        }

        const nodeProperties = record.get(`o`).properties;

        if (parentUid) {
            const parentRelQuery = `
                MATCH (parent:Organization { uid: $parentUid })
                MATCH (child:Organization { uid: $childUid })
                MERGE (parent)-[:PARENT_OF]->(child)
            `;
            await session.run(parentRelQuery, {
                parentUid,
                childUid: nodeProperties.uid,
            });
        }

        const hierarchyChain = await __BuildHierarchyChain(nodeProperties.uid);

        const organizationView: OrganizationView = {
            uid: nodeProperties.uid,
            name: nodeProperties.name,
            friendlyName: nodeProperties.friendly_name,
            parentUid: nodeProperties.parentUid ?? null,
            hierarchyChain,
        };

        const membershipResult = await AddCreatorAsOrganizationMember(
            createdByDiscordId,
            organizationView.uid,
        );
        if (!membershipResult.success) {
            log.warning(
                `Failed to add creator as member`,
                `OrganizationCreate`,
                `uid=${organizationView.uid} error=${membershipResult.error}`,
            );
        }

        log.info(
            `Organization created: ${organizationView.uid}`,
            `OrganizationCreate`,
            `name=${organizationView.name}`,
        );

        return { success: true, organization: organizationView };
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Failed to create organization`, message, `OrganizationCreate`);
        return { success: false, error: message };
    } finally {
        await session.close();
    }
}

/**
 * Build hierarchy chain from root to specified organization.
 * @param organizationUid Target organization UID.
 * @returns Promise<UID[]> Ordered list from root to target.
 */
async function __BuildHierarchyChain(organizationUid: UID): Promise<UID[]> {
    const session = await neo4jClient.GetSession(`READ`);
    try {
        const query = `
            MATCH path = (root:Organization)-[:PARENT_OF*0..]->(target:Organization { uid: $uid })
            WHERE root.parentUid IS NULL OR NOT EXISTS((root)<-[:PARENT_OF]-())
            RETURN [node IN nodes(path) | node.uid] as chain
            ORDER BY length(path) DESC
            LIMIT 1
        `;

        const result = await session.run(query, { uid: organizationUid });
        if (result.records.length === 0) {
            return [organizationUid];
        }

        return result.records[0].get(`chain`) as UID[];
    } catch {
        return [organizationUid];
    } finally {
        await session.close();
    }
}
