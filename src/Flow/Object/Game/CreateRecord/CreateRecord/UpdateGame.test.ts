import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock(`../../../../Setup/Neo4j.js`, () => {
    return {
        neo4jClient: {
            GetSession: vi.fn(),
        },
    };
});

const { UpdateGame } = await import(`../../CreateRecord.js`);
const { neo4jClient } = await import(`../../../../Setup/Neo4j.js`);

type Neo4jRecord = {
    get: (key: string) => unknown;
};

function buildRecord(map: Record<string, unknown>): Neo4jRecord {
    return {
        get: (key: string) => {
            return map[key];
        },
    };
}

describe(`UpdateGame`, () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it(`merges parameters and updates name and image`, async () => {
        const runMock = vi.fn();
        const closeMock = vi.fn();
        vi.mocked(neo4jClient.GetSession).mockResolvedValue({ run: runMock, close: closeMock } as any);

        const existingParamsRecord = buildRecord({
            serverId: `server_1`,
            params: [{ properties: { key: `currentTurn`, value: 1 } }],
        });
        const updateResultRecord = buildRecord({
            game: { properties: { uid: `game_1`, name: `Updated name`, image: `https://cdn.example/new.png` } },
        });

        runMock
            .mockResolvedValueOnce({ records: [existingParamsRecord] })
            .mockResolvedValueOnce({ records: [] })
            .mockResolvedValueOnce({ records: [updateResultRecord] });

        const result = await UpdateGame(`game_1`, {
            name: `Updated name`,
            image: `https://cdn.example/new.png`,
            parameters: { description: `Updated description` },
        });

        expect(runMock).toHaveBeenCalledTimes(3);
        expect(result).toEqual({
            uid: `game_1`,
            name: `Updated name`,
            image: `https://cdn.example/new.png`,
            serverId: `server_1`,
            parameters: { currentTurn: 1, description: `Updated description` },
            description: `Updated description`,
        });
        expect(closeMock).toHaveBeenCalled();
    });

    it(`throws when another game with same name exists`, async () => {
        const runMock = vi.fn();
        const closeMock = vi.fn();
        vi.mocked(neo4jClient.GetSession).mockResolvedValue({ run: runMock, close: closeMock } as any);

        const existingParamsRecord = buildRecord({
            serverId: `server_1`,
            params: [],
        });
        runMock.mockResolvedValueOnce({ records: [existingParamsRecord] }).mockResolvedValueOnce({ records: [{}] });

        await expect(
            UpdateGame(`game_1`, {
                name: `Duplicate name`,
                image: `https://cdn.example/new.png`,
            }),
        ).rejects.toThrow(`Game with this name already exists in the server`);
        expect(closeMock).toHaveBeenCalled();
    });

    it(`throws when the game cannot be found`, async () => {
        const runMock = vi.fn();
        const closeMock = vi.fn();
        vi.mocked(neo4jClient.GetSession).mockResolvedValue({ run: runMock, close: closeMock } as any);

        runMock.mockResolvedValueOnce({ records: [] });

        await expect(
            UpdateGame(`missing_game`, {
                name: `New name`,
                image: `https://cdn.example/new.png`,
            }),
        ).rejects.toThrow(`Game not found for update.`);
        expect(closeMock).toHaveBeenCalled();
    });
});
