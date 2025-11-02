import { describe, expect, it } from 'vitest';
import { createGameUpdateState } from '../../Create.js';
import type { Game } from '../../CreateRecord.js';

const sampleGame: Game = {
    uid: `game_test`,
    name: `Original Name`,
    image: `https://cdn.example/original.png`,
    serverId: `server_1`,
    parameters: { currentTurn: 2 },
    description: `Existing description`,
};

describe(`createGameUpdateState`, () => {
    it(`should initialize update mode with provided game data`, () => {
        const state = createGameUpdateState({
            serverId: sampleGame.serverId,
            ownerDiscordId: `user_1`,
            game: sampleGame,
            description: `  Updated description  `,
            organizationUid: `org_1`,
            organizationName: `Org Name`,
        });

        expect(state.mode).toBe(`update`);
        expect(state.serverId).toBe(sampleGame.serverId);
        expect(state.gameUid).toBe(sampleGame.uid);
        expect(state.ownerDiscordId).toBe(`user_1`);
        expect(state.gameName).toBe(sampleGame.name);
        expect(state.originalName).toBe(sampleGame.name);
        expect(state.description).toBe(`Updated description`);
        expect(state.originalDescription).toBe(`Updated description`);
        expect(state.imageUrl).toBe(sampleGame.image);
        expect(state.originalImageUrl).toBe(sampleGame.image);
        expect(state.organizationUid).toBe(`org_1`);
        expect(state.organizationName).toBe(`Org Name`);
        expect(state.controlsLocked).toBe(false);
    });
});
