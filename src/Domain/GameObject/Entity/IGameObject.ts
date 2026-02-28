import type { IParameterValue } from './IParameterValue.js';

export interface IGameObject {
    /** Unique instance identifier. @example 'obj_factory_001' */
    uid: string;

    /** UID of the template this object was created from. @example 'tpl_factory_abc123' */
    templateUid: string;

    /** UID of the game this object belongs to. @example 'game_xyz789' */
    gameUid: string;

    /** UID of the organization that owns this object. @example 'org_division3' */
    organizationUid: string;

    /** Instance-specific name (defaults to template name on creation). @example 'Northern Ironworks' */
    name: string;

    /** Current parameter values for this instance. Keyed by parameter key from the template. */
    parameters: IParameterValue[];

    /** ISO timestamp of creation. @example '2026-02-08T12:00:00.000Z' */
    createdAt: string;

    /** ISO timestamp of last modification. @example '2026-02-08T14:30:00.000Z' */
    updatedAt: string;
}
