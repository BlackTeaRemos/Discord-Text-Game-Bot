/** Properties hidden from the properties page because shown elsewhere */
export const HIDDEN_PROPERTIES = new Set([
    `uid`,
    `id`,
    `name`,
    `friendly_name`,
    `image`,
    `created_at`,
    `updated_at`,
    `createdAt`,
    `updatedAt`,
    `server_id`,
    `description`,
    `parameters_json`,
    `actions_json`,
    `owner_user_id`,
    `ownerUserId`,
    `template_uid`,
    `templateUid`,
    `parent_uid`,
    `parentUid`,
    `game_uid`,
    `gameUid`,
]);

/** Pattern matching property keys that are internal reference identifiers */
export const HIDDEN_PROPERTY_PATTERN = /(?:_id|Id|_uid|Uid|uuid)$/;
