export {
    CheckPermission as checkPermission,
    FormatPermissionToken as formatPermissionToken,
    GrantForever as grantForever,
    resolve,
} from '../../Common/permission/index.js';

export type {
    PermissionCheckResult,
    PermissionState,
    PermissionToken,
    PermissionTokenInput,
    PermissionsObject,
    TokenResolveContext,
    TokenSegmentInput,
} from '../../Common/permission/index.js';
