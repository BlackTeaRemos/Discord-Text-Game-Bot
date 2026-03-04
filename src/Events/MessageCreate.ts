import type { Message } from 'discord.js';
import { Log } from '../Common/Log.js';
import { flowManager } from '../Common/Flow/Manager.js';
import { MAIN_EVENT_BUS } from '../Events/MainEventBus.js';
import { EVENT_NAMES } from '../Domain/index.js';

export async function OnMessageCreate(message: Message): Promise<void> {
    try {
        MAIN_EVENT_BUS.Emit(EVENT_NAMES.userFlowMessage, message.id, message.author?.id);
        await flowManager.onMessage(message);
    } catch(error) {
        Log.error(`Flow manager failed to process message ${message.id}: ${(error as Error).message}`, `Flow`);
    }
}
