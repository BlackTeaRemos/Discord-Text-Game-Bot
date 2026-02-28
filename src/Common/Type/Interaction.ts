import { BaseInteraction } from 'discord.js';
import type { BaseInteraction as DiscordBaseInteraction } from 'discord.js';
import type { ExecutionContext } from '../../Domain/Command.js';

const executionContextStorageKey = Symbol.for(`mpg.interaction.executionContext`);
let interactionExecutionContextHydrated = false;

type InteractionPrototype = Record<PropertyKey, unknown>;

/**
 * Describe a discord js interaction that carries an execution context instance
 * @tparam TInteraction Interaction type to augment with the execution context
 */
export type InteractionExecutionContextCarrier<TInteraction extends DiscordBaseInteraction = DiscordBaseInteraction> =
    TInteraction & {
        executionContext: ExecutionContext;
    };

/**
 * Add getters and setters for executionContext onto the supplied prototype
 * @param target InteractionPrototype Prototype storing the execution context accessors
 * @returns void Accessors exist for instances created from the prototype
 */
function ensureExecutionContextAccessor(target: InteractionPrototype): void {
    if (!target || Object.getOwnPropertyDescriptor(target, `executionContext`)) {
        return;
    }

    Object.defineProperty(target, `executionContext`, {
        configurable: true,
        enumerable: false,
        get(this: DiscordBaseInteraction) {
            return Reflect.get(this, executionContextStorageKey) as ExecutionContext;
        },
        set(this: DiscordBaseInteraction, value: ExecutionContext) {
            Reflect.set(this, executionContextStorageKey, value);
        },
    });
}

/**
 * Walk up the prototype chain ensuring each level exposes executionContext
 * @param startPrototype InteractionPrototype Initial prototype that requires hydration
 * @returns void Every prototype between the interaction and Object exposes executionContext
 */
function hydratePrototypeChain(startPrototype: InteractionPrototype): void {
    let current: InteractionPrototype | null = startPrototype;
    while (current && current !== Object.prototype) {
        ensureExecutionContextAccessor(current);
        current = Object.getPrototypeOf(current) as InteractionPrototype | null;
    }
}

/**
 * Hydrate discord js interactions so they expose executionContext everywhere in the prototype chain
 * @returns void Interaction prototypes gain executionContext accessors
 */
export function HydrateInteractionExecutionContext(): void {
    if (interactionExecutionContextHydrated) {
        return;
    }

    hydratePrototypeChain(BaseInteraction.prototype as unknown as InteractionPrototype);
    interactionExecutionContextHydrated = true;
}

HydrateInteractionExecutionContext();
