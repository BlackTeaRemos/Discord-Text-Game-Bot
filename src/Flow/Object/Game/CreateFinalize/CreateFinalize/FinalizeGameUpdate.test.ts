import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Game } from '../../CreateRecord.js';
import type { GameCreateFlowState } from '../../CreateState.js';
import { FinalizeGameUpdate } from '../../CreateFinalize.js';

vi.mock(`../../CreateRecord.js`, async () => {
    const actual = await vi.importActual<object>(`../../CreateRecord.js`);
    return {
        ...actual,
        UpdateGame: vi.fn(),
        CreateGame: vi.fn(),
    };
});

vi.mock(`../Description/Update.js`, () => {
    return {
        CreateDescriptionVersion: vi.fn(),
    };
});

const UpdateGameMock = vi.mocked((await import(`../../CreateRecord.js`)).UpdateGame);
const CreateDescriptionVersionMock = vi.mocked((await import(`../Description/Update.js`)).CreateDescriptionVersion);

function buildState(overrides: Partial<GameCreateFlowState> = {}): GameCreateFlowState {
    return {
        serverId: overrides.serverId ?? `server_1`,
        mode: `update`,
        gameUid: overrides.gameUid ?? `game_1`,
        gameName: overrides.gameName ?? `Updated name`,
        description: overrides.description ?? `Updated description`,
        originalDescription: overrides.originalDescription ?? `Original description`,
        imageUrl: overrides.imageUrl ?? `https://cdn.example/new.png`,
        originalImageUrl: overrides.originalImageUrl ?? `https://cdn.example/old.png`,
        ownerDiscordId: overrides.ownerDiscordId ?? `user_1`,
        controlsLocked: overrides.controlsLocked ?? false,
        defaultName: overrides.defaultName,
        organizationUid: overrides.organizationUid,
        organizationName: overrides.organizationName,
        awaitingDescription: overrides.awaitingDescription,
        awaitingImage: overrides.awaitingImage,
        awaitingName: overrides.awaitingName,
        uploadInProgress: overrides.uploadInProgress,
        finalizing: overrides.finalizing,
        previewMessageId: overrides.previewMessageId,
        controlsMessageId: overrides.controlsMessageId,
    } as GameCreateFlowState;
}

const updatedGame: Game = {
    uid: `game_1`,
    name: `Updated name`,
    image: `https://cdn.example/new.png`,
    serverId: `server_1`,
    parameters: { currentTurn: 1, description: `Updated description` },
    description: `Updated description`,
};

beforeEach(() => {
    UpdateGameMock.mockReset();
    CreateDescriptionVersionMock.mockReset();
});

describe(`FinalizeGameUpdate`, () => {
    it(`fails when gameUid is missing`, async () => {
        const result = await FinalizeGameUpdate(buildState({ gameUid: undefined }));
        expect(result.success).toBe(false);
        expect(result.error).toContain(`Missing game identifier`);
        expect(UpdateGameMock).not.toHaveBeenCalled();
    });

    it(`persists updates and creates a new description version when text changes`, async () => {
        UpdateGameMock.mockResolvedValueOnce(updatedGame);
        CreateDescriptionVersionMock.mockResolvedValueOnce({
            uid: `d1`,
            version: 2,
            text: `Updated description`,
            isPublic: false,
        });

        const result = await FinalizeGameUpdate(buildState());

        expect(result.success).toBe(true);
        expect(result.game).toEqual(updatedGame);
        expect(UpdateGameMock).toHaveBeenCalledWith(`game_1`, {
            name: `Updated name`,
            image: `https://cdn.example/new.png`,
            parameters: { description: `Updated description` },
        });
        expect(CreateDescriptionVersionMock).toHaveBeenCalledWith(
            `game`,
            `game_1`,
            ``,
            `Updated description`,
            `user_1`,
        );
    });

    it(`skips description version creation when text is unchanged`, async () => {
        UpdateGameMock.mockResolvedValueOnce(updatedGame);

        const result = await FinalizeGameUpdate(
            buildState({ description: `Original description`, originalDescription: `Original description` }),
        );

        expect(result.success).toBe(true);
        expect(CreateDescriptionVersionMock).not.toHaveBeenCalled();
    });
});
