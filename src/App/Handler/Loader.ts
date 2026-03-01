import type { Client } from 'discord.js';
import { CreateSafeEventListener } from '../../Common/SafeEventListener.js';
import { Log } from '../../Common/Log.js';
import { interactionCreateDescriptor } from './Listener/InteractionCreate.js';
import { messageCreateDescriptor } from './Listener/MessageCreate.js';

/**
 * Map of externally provided optional handlers
 */
export type ProvidedHandlers = {
    onInteractionCreate?: Function; // optional external handler
    onMessageCreate?: Function; // optional external handler
};

/**
 * Initialize and register optional client handlers using descriptors from the Handler Listener folder
 */
export function InitializeHandlers(client: Client, providedHandlers: ProvidedHandlers): void {
    const descriptors = [interactionCreateDescriptor, messageCreateDescriptor];

    for (const desc of descriptors) {
        const listener = (providedHandlers as any)[desc.key];
        if (!listener) {
            continue;
        }

        client.on(
            desc.event,
            CreateSafeEventListener(listener as any, {
                name: desc.name,
                onError: (error, providedName) => {
                    Log.error(`${providedName ?? desc.name} listener error: ${String(error)}`, `Boot`);
                },
            }) as any,
        );
    }
}
