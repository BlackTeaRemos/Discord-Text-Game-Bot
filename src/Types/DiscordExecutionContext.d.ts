import type { CacheType } from 'discord.js';
import type { ExecutionContext } from '../Domain/Command.js';

declare module 'discord.js' {
    interface BaseInteraction<Cached extends CacheType = CacheType> {
        executionContext: ExecutionContext;
    }

    interface Interaction<Cached extends CacheType = CacheType> {
        executionContext: ExecutionContext;
    }

    interface RepliableInteraction<Cached extends CacheType = CacheType> {
        executionContext: ExecutionContext;
    }

    interface CommandInteraction<Cached extends CacheType = CacheType> {
        executionContext: ExecutionContext;
    }

    interface ChatInputCommandInteraction<Cached extends CacheType = CacheType> {
        executionContext: ExecutionContext;
    }

    interface ContextMenuCommandInteraction<Cached extends CacheType = CacheType> {
        executionContext: ExecutionContext;
    }

    interface AutocompleteInteraction<Cached extends CacheType = CacheType> {
        executionContext: ExecutionContext;
    }

    interface MessageComponentInteraction<Cached extends CacheType = CacheType> {
        executionContext: ExecutionContext;
    }

    interface ModalSubmitInteraction<Cached extends CacheType = CacheType> {
        executionContext: ExecutionContext;
    }
}
