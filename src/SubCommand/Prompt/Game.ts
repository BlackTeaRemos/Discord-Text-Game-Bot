import { ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { ListGamesForServer, type ServerGameListItem } from '../../Flow/Object/Game/ListGamesForServer.js';

/**
 * States returned when preparing a game selection prompt
 */
export type GamePromptStatus = `empty` | `auto` | `prompt`;

/**
 * Options accepted when building a game selection prompt
 * @property serverId string Discord guild id requesting selection @example '123456789012345678'
 * @property customId string Custom id attached to the select menu @example 'select_game'
 * @property placeholder string Placeholder shown on the select @example 'Select game'
 * @property promptMessage string Message displayed when prompting the user @example 'Choose game to continue.'
 * @property emptyMessage string Message returned when server has no games @example 'No games available.'
 * @property limit number Maximum number of games to surface from 1 to 25 @example 10
 */
export interface GamePromptOptions {
    serverId: string;
    customId: string;
    placeholder?: string;
    promptMessage?: string;
    emptyMessage?: string;
    limit?: number;
}

/**
 * Result describing how the caller should proceed after preparing the prompt
 * @property status GamePromptStatus Indicates whether to prompt auto select or abort
 * @property games ServerGameListItemArray Raw list of games
 * @property components ActionRowBuilderArray Select menu rows returned when prompting
 * @property message string Suggested message to display
 * @property game ServerGameListItem Auto selected game
 */
export interface GamePromptResult {
    status: GamePromptStatus;
    games: ServerGameListItem[];
    components?: ActionRowBuilder<StringSelectMenuBuilder>[];
    message?: string;
    game?: ServerGameListItem;
}

/**
 * Prepare a game selection prompt handling empty and auto select cases
 * @param options GamePromptOptions Configuration describing the prompt
 * @returns GamePromptResult Prompt result instructing caller whether to prompt or auto select
 */
export async function PrepareGamePrompt(options: GamePromptOptions): Promise<GamePromptResult> {
    const games = await ListGamesForServer(options.serverId);

    if (games.length === 0) {
        return {
            status: `empty`,
            games,
            message: options.emptyMessage ?? `No games found for this server.`,
        };
    }

    return {
        status: `auto`,
        games,
        game: games[0],
    };
}
