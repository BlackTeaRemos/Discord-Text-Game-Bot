import type { Message } from 'discord.js';
import { Log } from '../Common/Log.js';
import { flowManager } from '../Common/Flow/Manager.js';

/**
 * @brief Handles the messageCreate event forwarding relevant messages to the flow manager
 * @param message Message Discord message instance emitted by the gateway
 * @returns void Resolves once flow processing is complete
 * @example
 * client.on('messageCreate', onMessageCreate);
 */
export async function OnMessageCreate(message: Message): Promise<void> {
    // Delegate to flow manager for any active user flows expecting message input
    try {
        await flowManager.onMessage(message);
    } catch (error) {
        Log.error(`Flow manager failed to process message ${message.id}: ${(error as Error).message}`, `Flow`);
    }
}
