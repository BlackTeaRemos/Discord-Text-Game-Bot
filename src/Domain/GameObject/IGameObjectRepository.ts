import type { IGameObject } from './IGameObject.js';
import type { IParameterValue } from './IParameterValue.js';

export interface IGameObjectRepository {
    /**
     * @brief Create a new game object instance from a template owned by an organization
     * @param options Creation parameters including template uid and organization uid and optional name override
     * @returns Promise_IGameObject Persisted instance with default parameter values from template
     */
    Create(options: {
        templateUid: string;
        gameUid: string;
        organizationUid: string;
        name?: string;
    }): Promise<IGameObject>;

    /**
     * @brief Retrieve a game object by uid
     * @param uid string Instance identifier @example 'obj_factory_001'
     * @returns Promise_IGameObject_or_null Instance or null if not found
     */
    GetByUid(uid: string): Promise<IGameObject | null>;

    /**
     * @brief List all game objects for a given game optionally filtered by organization or template
     * @param gameUid string Game identifier
     * @param filters Optional filtering criteria
     * @returns Promise_IGameObject_array Matching instances
     */
    ListByGame(gameUid: string, filters?: {
        organizationUid?: string;
        templateUid?: string;
    }): Promise<IGameObject[]>;

    /**
     * @brief Search game objects by name within a game scope using case insensitive partial match
     * @param gameUid string Game identifier
     * @param searchTerm string Partial name to match
     * @param limit number Maximum results to return defaulting to 25
     * @returns Promise_IGameObject_array Matching instances
     */
    SearchByName(gameUid: string, searchTerm: string, limit?: number): Promise<IGameObject[]>;

    /**
     * @brief Update parameter values on an object instance
     * @param uid string Object instance uid
     * @param parameters IParameterValue_array New parameter values to set with partial update merge semantics
     * @returns Promise_IGameObject Updated instance
     */
    UpdateParameters(uid: string, parameters: IParameterValue[]): Promise<IGameObject>;

    /**
     * @brief Batch update parameters for multiple objects used by the turn engine
     * @param updates Array of objectUid and parameters pairs to apply in a single transaction
     * @returns Promise_void
     */
    BatchUpdateParameters(updates: Array<{
        objectUid: string;
        parameters: IParameterValue[];
    }>): Promise<void>;

    /**
     * @brief Delete a game object instance and its parameter value nodes
     * @param uid string Object instance uid
     * @returns Promise_boolean True if deleted or false if not found
     */
    Delete(uid: string): Promise<boolean>;
}
