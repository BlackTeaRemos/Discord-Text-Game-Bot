import { neo4jClient } from '../../../Setup/Neo4j.js';
import { InMemoryCache } from '../../../Common/InMemoryCache.js';

/** In-memory TTL cache for user locale lookups (5 min, 200 entries). */
const _localeCache = new InMemoryCache<string | null>(5 * 60 * 1000, 200);

/**
 * Set the preferred locale for a Discord user.
 * @param discordId Discord user id
 * @param locale locale string to set, or null to clear
 */
export async function SetUserLocale(discordId: string, locale: string | null): Promise<void> {
    const session = await neo4jClient.GetSession(`WRITE`);
    try {
        const query = `
            MERGE (u:User { discord_id: $discordId })
            SET u.preferred_locale = $locale
            RETURN u
        `;
        await session.run(query, { discordId, locale });
        _localeCache.Set(discordId, locale);
    } finally {
        await session.close();
    }
}

/**
 * Retrieve the preferred locale for a Discord user.
 * @param discordId Discord user id
 * @returns preferred locale string or null when not set
 */
export async function GetUserLocale(discordId: string): Promise<string | null> {
    const cached = _localeCache.Get(discordId);
    if (cached !== undefined) {
        return cached;
    }

    const session = await neo4jClient.GetSession(`READ`);
    try {
        const query = `
            MATCH (u:User { discord_id: $discordId })
            RETURN u.preferred_locale AS preferred_locale
        `;
        const result = await session.run(query, { discordId });
        const rec = result.records[0];
        const localeValue = rec ? (rec.get(`preferred_locale`) as string | null) : null;
        _localeCache.Set(discordId, localeValue);
        return localeValue;
    } finally {
        await session.close();
    }
}
