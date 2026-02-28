/**
 * Describes a single slash command reference the user can invoke on an object
 * @property command string Full slash command syntax
 * @property description string Short explanation of what it does
 *
 * @example { command: '/view object id:{uid}', description: 'View object details' }
 */
export interface ObjectAction {
    command: string;
    description: string;
}

/**
 * Internal registry mapping object type to available slash commands
 * Keys match the type string returned by ResolveObjectByUid
 */
const _ACTION_REGISTRY: Record<string, ObjectAction[]> = {
    game: [
        { command: `/view game`, description: `View game overview` },
        { command: `/manage game`, description: `Manage turn and settings` },
        { command: `/edit description object:{uid}`, description: `Edit game description` },
        { command: `/view objects`, description: `List game objects` },
        { command: `/view templates`, description: `List game templates` },
    ],
    task: [
        { command: `/view task id:{uid}`, description: `View task details` },
        { command: `/view task`, description: `List all tasks` },
    ],
    organization: [
        { command: `/organization view organization:{uid}`, description: `View org details` },
        { command: `/organization assign organization:{uid} object:{...}`, description: `Assign object to org` },
        { command: `/organization unassign organization:{uid} object:{...}`, description: `Remove object from org` },
        { command: `/organization set_parent organization:{uid}`, description: `Change org hierarchy` },
        { command: `/edit description object:{uid}`, description: `Edit org description` },
    ],
    character: [
        { command: `/view object object:{uid}`, description: `View character` },
        { command: `/edit description object:{uid}`, description: `Edit character description` },
    ],
    factory: [
        { command: `/view object object:{uid}`, description: `View building` },
        { command: `/edit description object:{uid}`, description: `Edit building description` },
    ],
    user: [
        { command: `/view object object:{uid}`, description: `View user profile` },
        { command: `/user config`, description: `Manage user settings` },
    ],
};

/** Fallback actions available for any object type */
const _GENERIC_ACTIONS: ObjectAction[] = [
    { command: `/view object object:{uid}`, description: `View object details` },
    { command: `/edit description object:{uid}`, description: `Edit description` },
];

/**
 * Resolve available slash command actions for a given object type
 * Substitutes {uid} placeholders with the actual object UID
 *
 * @param objectType string Type discriminator from ResolveObjectByUid
 * @param objectUid string Actual UID to substitute into command templates
 * @returns ObjectAction[] List of actions with resolved UIDs
 *
 * @example
 * const actions = ResolveObjectActions('game', 'game_abc');
 * // actions[0].command -> '/view game'
 * // actions[2].command -> '/edit description object:game_abc'
 */
export function ResolveObjectActions(objectType: string, objectUid: string): ObjectAction[] {
    const template = _ACTION_REGISTRY[objectType] ?? _GENERIC_ACTIONS;
    return template.map(action => {
        return {
            command: action.command.replace(/\{uid\}/g, objectUid),
            description: action.description,
        };
    });
}
