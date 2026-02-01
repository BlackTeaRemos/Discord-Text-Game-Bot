import type { ObjectTypeKey } from '../../../Common/Flow/ObjectRegistry.js';

/**
 * Resolve a Neo4j label for supported object types.
 * @param objectType ObjectTypeKey Object type key used by view and registry. @example 'building'
 * @returns string Neo4j label for the object type. @example 'Factory'
 */
export function ResolveObjectLabel(objectType: ObjectTypeKey): string {
    switch (objectType) {
        case `game`:
            return `Game`;
        case `organization`:
            return `Organization`;
        case `user`:
            return `User`;
        case `building`:
            return `Factory`;
        case `task`:
            return `Task`;
        default:
            return `Entity`;
    }
}
