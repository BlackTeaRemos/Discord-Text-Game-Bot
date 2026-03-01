import type { IObjectProjection } from '../Entity/Projection/IObjectProjection.js';
import type { IProjectedParameter } from '../Entity/Projection/IProjectedParameter.js';
import type { ProjectionDisplayStyle } from '../Entity/Projection/ProjectionDisplayStyle.js';
import type { ProjectionStatus } from '../Entity/Projection/IObjectProjection.js';

/**
 * @brief Repository contract for persisting and querying organization scoped object projections
 */
export interface IObjectProjectionRepository {
    /**
     * @brief Create a new projection linking an organization to a game object
     * @param options Creation parameters including object uid and organization uid and display style
     * @returns Promise_IObjectProjection Persisted projection
     */
    Create(options: {
        objectUid: string;
        templateUid: string;
        organizationUid: string;
        name: string;
        displayStyle: ProjectionDisplayStyle;
        autoSync: boolean;
        knownParameters: IProjectedParameter[];
    }): Promise<IObjectProjection>;

    /**
     * @brief Retrieve a projection by its unique identifier
     * @param uid string Projection uid @example 'proj_abc123'
     * @returns Promise_IObjectProjection_or_null Projection or null if not found
     */
    GetByUid(uid: string): Promise<IObjectProjection | null>;

    /**
     * @brief Retrieve the projection for a specific organization and object pair
     * @param organizationUid string Organization identifier
     * @param objectUid string Game object identifier
     * @returns Promise_IObjectProjection_or_null Projection or null if the org has no knowledge of this object
     */
    GetByOrganizationAndObject(
        organizationUid: string,
        objectUid: string,
    ): Promise<IObjectProjection | null>;

    /**
     * @brief List all projections an organization holds
     * @param organizationUid string Organization identifier
     * @param filters Optional status filter
     * @returns Promise_IObjectProjection_array All projections the org knows about
     */
    ListByOrganization(
        organizationUid: string,
        filters?: { status?: ProjectionStatus; templateUid?: string },
    ): Promise<IObjectProjection[]>;

    /**
     * @brief List all projections pointing at a specific game object
     * @param objectUid string Game object identifier
     * @param filters Optional filter by autoSync or status
     * @returns Promise_IObjectProjection_array All org projections of this object
     */
    ListByObject(
        objectUid: string,
        filters?: { autoSync?: boolean; status?: ProjectionStatus },
    ): Promise<IObjectProjection[]>;

    /**
     * @brief Update the known parameters on a projection
     * @param uid string Projection uid
     * @param knownParameters IProjectedParameter_array Replacement parameter set
     * @returns Promise_IObjectProjection Updated projection
     */
    UpdateKnownParameters(
        uid: string,
        knownParameters: IProjectedParameter[],
    ): Promise<IObjectProjection>;

    /**
     * @brief Update projection metadata such as name or display style or auto sync flag
     * @param uid string Projection uid
     * @param fields Partial fields to update
     * @returns Promise_IObjectProjection Updated projection
     */
    UpdateMetadata(
        uid: string,
        fields: {
            name?: string;
            displayStyle?: ProjectionDisplayStyle;
            autoSync?: boolean;
            status?: ProjectionStatus;
        },
    ): Promise<IObjectProjection>;

    /**
     * @brief Batch update known parameters for multiple projections in a single transaction used by turn sync
     * @param updates Array of projectionUid and knownParameters pairs
     * @returns Promise_void
     */
    BatchUpdateKnownParameters(
        updates: Array<{
            projectionUid: string;
            knownParameters: IProjectedParameter[];
        }>,
    ): Promise<void>;

    /**
     * @brief Mark all projections of a destroyed object as DESTROYED
     * @param objectUid string Game object identifier
     * @returns Promise_number Count of projections marked
     */
    MarkDestroyedByObject(objectUid: string): Promise<number>;
}
