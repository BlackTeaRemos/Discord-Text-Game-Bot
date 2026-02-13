import type { IGameObjectTemplate } from './IGameObjectTemplate.js';

export interface IGameObjectTemplateRepository {
    /**
     * Persist a new template for a game.
     * @param template IGameObjectTemplate Template to create.
     * @returns Promise<IGameObjectTemplate> Persisted template with generated uid.
     */
    Create(template: Omit<IGameObjectTemplate, `uid` | `createdAt` | `updatedAt`>): Promise<IGameObjectTemplate>;

    /**
     * Retrieve a template by its uid.
     * @param uid string Template identifier. @example 'tpl_factory_abc123'
     * @returns Promise<IGameObjectTemplate | null> Template or null if not found.
     */
    GetByUid(uid: string): Promise<IGameObjectTemplate | null>;

    /**
     * List all templates for a game.
     * @param gameUid string Game identifier. @example 'game_xyz789'
     * @returns Promise<IGameObjectTemplate[]> All templates belonging to the game.
     */
    ListByGame(gameUid: string): Promise<IGameObjectTemplate[]>;

    /**
     * Find a template by name within a game.
     * @param gameUid string Game identifier. @example 'game_xyz789'
     * @param name string Template name (case-sensitive). @example 'Factory'
     * @returns Promise<IGameObjectTemplate | null> Template or null if not found.
     */
    FindByName(gameUid: string, name: string): Promise<IGameObjectTemplate | null>;

    /**
     * Update an existing template. Replaces parameters and actions entirely.
     * @param uid string Template uid to update. @example 'tpl_factory_abc123'
     * @param updates Partial<IGameObjectTemplate> Fields to update.
     * @returns Promise<IGameObjectTemplate> Updated template.
     */
    Update(uid: string, updates: Partial<Omit<IGameObjectTemplate, `uid` | `gameUid` | `createdAt`>>): Promise<IGameObjectTemplate>;

    /**
     * Delete a template and its associated definition nodes. Does not delete instances.
     * @param uid string Template uid. @example 'tpl_factory_abc123'
     * @returns Promise<boolean> True if deleted, false if not found.
     */
    Delete(uid: string): Promise<boolean>;
}
