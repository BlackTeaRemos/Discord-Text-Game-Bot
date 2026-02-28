/**
 * @brief InMemoryCache provides a simple TTL based LRU cache for storing objects in memory
 * Used to reduce Discord API calls for frequently accessed data
 */
export class InMemoryCache<T> {
    // Internal cache map storing key to value and expiresAt pairs
    private _cache: Map<string, { value: T; expiresAt: number }> = new Map();

    // Default time to live for cache entries in milliseconds
    private _ttl: number; // default TTL
    private _maxSize: number; // max cache size

    private _metrics?: { IncCacheHit: () => void; IncCacheMiss: () => void }; // optional metrics sink

    /**
     * @param ttlMs number TTL in milliseconds for cache entries defaults to 5 min
     * @param maxSize number Maximum number of entries in cache defaults to 100
     */
    constructor(
        ttlMs: number = 5 * 60 * 1000,
        maxSize: number = 100,
        metrics?: { IncCacheHit: () => void; IncCacheMiss: () => void },
    ) {
        this._ttl = ttlMs;
        this._maxSize = maxSize;
        this._metrics = metrics; // store optional metrics handler
    }

    /**
     * @brief Set a value in the cache updating LRU order and evicting if needed
     * @param key string Cache key
     * @param value T Value to cache
     * @param ttlOverrideMs number Optional TTL override in milliseconds
     */
    public Set(key: string, value: T, ttlOverrideMs?: number): void {
        const expiresAt = Date.now() + (ttlOverrideMs ?? this._ttl);

        if (this._cache.has(key)) {
            this._cache.delete(key); // Remove to reinsert for LRU
        }
        this._cache.set(key, { value, expiresAt });

        // LRU eviction
        if (this._cache.size > this._maxSize) {
            // Remove oldest entry which was first inserted
            const oldest = this._cache.keys().next();

            if (!oldest.done && oldest.value !== undefined) {
                this._cache.delete(oldest.value);
            }
        }
    }

    /**
     * @brief Get a value from the cache if not expired updating LRU order
     * @param key string Cache key
     * @returns T or undefined Cached value or undefined if expired or missing
     */
    public Get(key: string): T | undefined {
        const entry = this._cache.get(key);

        if (!entry) {
            this._metrics?.IncCacheMiss(); // metrics miss
            return undefined;
        }

        if (Date.now() > entry.expiresAt) {
            this._cache.delete(key);
            this._metrics?.IncCacheMiss(); // metrics expired counts as miss
            return undefined;
        }
        // LRU move to end
        this._cache.delete(key);
        this._cache.set(key, entry);
        this._metrics?.IncCacheHit(); // metrics hit
        return entry.value;
    }

    /**
     * @brief Remove a value from the cache
     * @param key string Cache key
     */
    public Delete(key: string): void {
        this._cache.delete(key);
    }

    /**
     * @brief Clear all cache entries
     */
    public Clear(): void {
        this._cache.clear();
    }
}
