import type { IProjectedParameter } from './IProjectedParameter.js';
import type { ProjectionDisplayStyle } from './ProjectionDisplayStyle.js';

export type ProjectionStatus = 'ACTIVE' | 'DESTROYED';

/**
 * @brief Organization scoped partial view of a GameObject representing what one org believes about it
 */
export interface IObjectProjection {
    /** Unique projection identifier @example 'proj_abc123' */
    uid: string;

    /** UID of the real GameObject this projection represents @example 'gobj_def456' */
    objectUid: string;

    /** UID of the template the real object was instantiated from @example 'tpl_factory_abc123' */
    templateUid: string;

    /** UID of the organization that owns this projection @example 'org_division3' */
    organizationUid: string;

    /** Organization display name for this object which can differ from the real name @example 'The Enemy Forge' */
    name: string;

    /** Visual style discriminator controlling card color scheme @example 'HOSTILE' */
    displayStyle: ProjectionDisplayStyle;

    /** Whether the real object still exists or has been destroyed @example 'ACTIVE' */
    status: ProjectionStatus;

    /** Whether this projection auto syncs with ground truth on every turn mutation @example true */
    autoSync: boolean;

    /** Subset of parameters this organization knows about or estimates */
    knownParameters: IProjectedParameter[];

    /** ISO timestamp of projection creation @example '2026-02-08T12:00:00.000Z' */
    createdAt: string;

    /** ISO timestamp of last modification @example '2026-02-08T14:30:00.000Z' */
    updatedAt: string;
}
