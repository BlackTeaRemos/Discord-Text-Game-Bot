import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ButtonInteraction } from 'discord.js';

vi.mock(`../../../Flow/Object/Game/View.js`, () => {
    return {
        GetGame: vi.fn(),
    };
});

vi.mock(`../../../Flow/Object/Game/Create.js`, () => {
    const state = {
        serverId: `server_1`,
        mode: `update` as const,
        gameUid: `game_1`,
        gameName: `Mock game`,
        description: `Mock description`,
        originalDescription: `Mock description`,
        imageUrl: `https://cdn.example/game.png`,
        originalImageUrl: `https://cdn.example/game.png`,
        ownerDiscordId: `user_1`,
        controlsLocked: false,
    };
    return {
        createGameUpdateState: vi.fn(() => {
            return { ...state };
        }),
        createGameCreateState: vi.fn(),
    };
});

vi.mock(`../../../SubCommand/Object/Game/Renderers/BuildGamePreviewEmbed.js`, () => {
    return {
        BuildGamePreviewEmbed: vi.fn(() => {
            return { title: `embed` };
        }),
    };
});

vi.mock(`../../../SubCommand/Object/Game/Renderers/BuildControlsContent.js`, () => {
    return {
        BuildControlsContent: vi.fn(() => {
            return `controls`;
        }),
    };
});

vi.mock(`../../../SubCommand/Object/Game/Renderers/BuildControlRows.js`, () => {
    return {
        BuildControlRows: vi.fn(() => {
            return [];
        }),
    };
});

vi.mock(`../../../SubCommand/Object/Game/GameCreateControls.js`, () => {
    return {
        RegisterGameCreateSession: vi.fn(),
    };
});

const GetGameMock = vi.mocked((await import(`../../../Flow/Object/Game/View.js`)).GetGame);
const createGameUpdateStateMock = vi.mocked(
    (await import(`../../../Flow/Object/Game/Create.js`)).createGameUpdateState,
);
const RegisterGameCreateSessionMock = vi.mocked(
    (await import(`../../../SubCommand/Object/Game/GameCreateControls.js`)).RegisterGameCreateSession,
);
const viewModule = await import(`../../View.js`);
const { HandleViewGameUpdateInteraction, __viewCommandTesting } = viewModule;

function buildButtonInteraction(overrides: Partial<ButtonInteraction> = {}): ButtonInteraction {
    return {
        customId: `view_game_update_start`,
        message: { id: `message_1` } as any,
        deferred: false,
        replied: false,
        deferUpdate: vi.fn().mockResolvedValue(undefined),
        reply: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    } as ButtonInteraction;
}

describe(`HandleViewGameUpdateInteraction`, () => {
    beforeEach(() => {
        __viewCommandTesting.resetGameUpdateContexts();
        GetGameMock.mockReset();
        createGameUpdateStateMock.mockClear();
        RegisterGameCreateSessionMock.mockClear();
    });

    it(`returns false when customId does not match`, async () => {
        const interaction = buildButtonInteraction({ customId: `other` });
        const handled = await HandleViewGameUpdateInteraction(interaction);
        expect(handled).toBe(false);
    });

    it(`replies with expiration notice when no context is registered`, async () => {
        const interaction = buildButtonInteraction();
        const handled = await HandleViewGameUpdateInteraction(interaction);
        expect(handled).toBe(true);
        expect(interaction.reply).toHaveBeenCalledWith(
            expect.objectContaining({ content: expect.stringContaining(`no longer active`) }),
        );
    });

    it(`starts update flow when context and game are available`, async () => {
        const followUp = vi
            .fn()
            .mockResolvedValueOnce({ id: `preview_message` })
            .mockResolvedValueOnce({ id: `controls_message` });
        const editMessage = vi.fn().mockResolvedValue(undefined);
        const baseInteraction = {
            guildId: `server_1`,
            user: { id: `user_1` },
            followUp,
            webhook: { editMessage },
        } as any;

        __viewCommandTesting.registerGameUpdateContext(`message_1`, {
            interaction: baseInteraction,
            gameUid: `game_1`,
            orgUid: `org_1`,
            orgName: `Org`,
            registeredAt: Date.now(),
        });

        GetGameMock.mockResolvedValueOnce({
            uid: `game_1`,
            name: `Game`,
            image: `https://cdn.example/game.png`,
            serverId: `server_1`,
            parameters: {},
            description: `Game description`,
        });

        const interaction = buildButtonInteraction();
        const handled = await HandleViewGameUpdateInteraction(interaction);

        expect(handled).toBe(true);
        expect(interaction.deferUpdate).toHaveBeenCalled();
        expect(editMessage).toHaveBeenCalled();
        expect(followUp).toHaveBeenCalledTimes(2);
        expect(createGameUpdateStateMock).toHaveBeenCalled();
        expect(RegisterGameCreateSessionMock).toHaveBeenCalledWith(
            expect.objectContaining({
                previewMessageId: `preview_message`,
                controlsMessageId: `controls_message`,
            }),
        );
    });
});
