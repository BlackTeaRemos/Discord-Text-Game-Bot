import neo4j, { auth, type Driver, type Session } from 'neo4j-driver';

export interface Neo4jConfig {
    uri: string; // connection URI for the database
    username: string; // db user
    password: string; // db password
    database?: string; // optional database name
}

/**
 * @brief Small client holding a singleton like driver instance with explicit init and close
 */
export class Neo4jClient {
    private _driver: Driver | null = null; // underlying driver instance
    private _config: Neo4jConfig; // connection settings

    /**
     * @brief Initialize client with provided configuration without connecting
     * @param config Neo4jConfig connection settings
     */
    constructor(config: Neo4jConfig) {
        this._config = config;
    }

    /**
     * @brief Establish a driver connection if not already created
     */
    async Init(): Promise<void> {
        if (this._driver) {
            return;
        } // already initialized
        const token = auth.basic(this._config.username, this._config.password);
        this._driver = neo4j.driver(this._config.uri, token);
        // Verify connectivity early to fail fast
        await this._driver.verifyConnectivity();
    }

    /**
     * @brief Acquire a session bound to configured database
     */
    async GetSession(mode: `READ` | `WRITE` = `WRITE`): Promise<Session> {
        if (!this._driver) {
            throw new Error(`Neo4jClient not initialized. Call Init() first.`);
        }
        const isRead = mode === `READ`;
        return this._driver.session({
            database: this._config.database,
            defaultAccessMode: isRead ? neo4j.session.READ : neo4j.session.WRITE,
        });
    }

    /**
     * @brief Close underlying driver and free sockets
     */
    async Close(): Promise<void> {
        if (this._driver) {
            await this._driver.close();
            this._driver = null;
        }
    }
}
