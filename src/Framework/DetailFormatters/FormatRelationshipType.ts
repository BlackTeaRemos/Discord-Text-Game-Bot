/**
 * Format a Neo4j relationship type to a human-readable label
 * HAS_PARAMETER -> Has Parameter, BELONGS_TO -> Belongs To
 *
 * @param relType string Raw relationship type
 * @returns string Readable label
 *
 * @example FormatRelationshipType('HAS_PARAMETER') // 'Has Parameter'
 */
export function FormatRelationshipType(relType: string): string {
    return relType
        .replace(/_/g, ` `)
        .toLowerCase()
        .replace(/\b\w/g, char => { return char.toUpperCase(); });
}
