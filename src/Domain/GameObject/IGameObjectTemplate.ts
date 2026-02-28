import type { IParameterDefinition } from './IParameterDefinition.js';
import type { IActionDefinition } from './IActionDefinition.js';
import type { ITemplateDisplayConfig } from './ITemplateDisplayConfig.js';

export interface IGameObjectTemplate {
    /** Unique template identifier. @example 'tpl_factory_abc123' */
    uid: string;

    /** Game UID this template belongs to. @example 'game_xyz789' */
    gameUid: string;

    /** Human-readable template name. @example 'Factory' */
    name: string;

    /** Optional description of what this object type represents. @example 'A production building that converts resources.' */
    description: string;

    /** Parameter definitions this template declares. Each defines a named slot with type and default. */
    parameters: IParameterDefinition[];

    /** Action definitions executed on events. Each contains expressions referencing parameter keys. */
    actions: IActionDefinition[];

    /** Optional display configuration controlling how objects are rendered on visual cards. */
    displayConfig?: ITemplateDisplayConfig;

    /** ISO timestamp of creation. @example '2026-02-08T12:00:00.000Z' */
    createdAt: string;

    /** ISO timestamp of last modification. @example '2026-02-08T14:30:00.000Z' */
    updatedAt: string;
}
