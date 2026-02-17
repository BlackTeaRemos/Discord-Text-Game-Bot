import type { IGameObject } from './IGameObject.js';
import type { IParameterValue } from './IParameterValue.js';

export interface IGameObjectRepository {
    /**
     * Create a new game object instance from a template, owned by an organization.
     * @param options Creation parameters including template uid, organization uid, and optional name override.
     * @returns Promise<IGameObject> Persisted instance with default parameter values from template.
     */
    Create(options: {
        templateUid: string;
        gameUid: string;
        organizationUid: string;
        name?: string;
    }): Promise<IGameObject>;

    /**
     * Retrieve a game object by uid.
     * @param uid string Instance identifier. @example 'obj_factory_001'
     * @returns Promise<IGameObject | null> Instance or null if not found.
     */
    GetByUid(uid: string): Promise<IGameObject | null>;

    /**
     * List all game objects for a given game, optionally filtered by organization or template.
     * @param gameUid string Game identifier.
     * @param filters Optional filtering criteria.
     * @returns Promise<IGameObject[]> Matching instances.
     */
    ListByGame(gameUid: string, filters?: {
        organizationUid?: string;
        templateUid?: string;
    }): Promise<IGameObject[]>;

    /**
     * Search game objects by name within a game scope
     * Case-insensitive partial match on object name
     * @param gameUid string Game identifier
     * @param searchTerm string Partial name to match
     * @param limit number Maximum results to return, default 25
     * @returns Promise<IGameObject[]> Matching instances
     */
    SearchByName(gameUid: string, searchTerm: string, limit?: number): Promise<IGameObject[]>;

    /**
     * Update parameter values on an object instance.
     * @param uid string Object instance uid.
     * @param parameters IParameterValue[] New parameter values to set (partial update, merge semantics).
     * @returns Promise<IGameObject> Updated instance.
     */
    UpdateParameters(uid: string, parameters: IParameterValue[]): Promise<IGameObject>;

    /**
     * Batch update parameters for multiple objects. Used by the turn engine.
     * @param updates Array of { objectUid, parameters } to apply in a single transaction.
     * @returns Promise<void>
     */
    BatchUpdateParameters(updates: Array<{
        objectUid: string;
        parameters: IParameterValue[];
    }>): Promise<void>;

    /**
     * Delete a game object instance and its parameter value nodes.
     * @param uid string Object instance uid.
     * @returns Promise<boolean> True if deleted, false if not found.
     */
    Delete(uid: string): Promise<boolean>;
}
