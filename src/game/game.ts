import { renderMapBuffer } from './renderer';
import { createGameMap, getCurrentRoom, isVisitedRoom, rollRoomDice } from './map';

import { ChatInputCommandInteraction } from 'discord.js';

export type GameSession = {
    state: GameState;
    map: GameMap;
    option: GameOption;
    mapBuffer: Buffer;
};

export type GameOption = {
    scaleValue: number;
};

export type GameState = {
    currentRoomIndex: number;
    visitedRoomIndices: number[];
    visitedRoomKinds: { [key in GameRoomKind]?: number[] };
};

export type GameMap = {
    width: number;
    height: number;
    rooms: GameRoom[];
    doorCoords: { x: number; y: number }[]; // Ignored when serialized
};

export type GameRoomKind =
    | 'Normal'
    | 'HotSpring'
    | 'Diner'
    | 'Forest'
    | 'Shop'
    | 'Beach'
    | 'Bed'
    | 'Library'
    | 'Circus'
    | 'TreasureBox'
    | 'RedDoor';

export type GameRoom = {
    idx: number;
    connections: RoomConnection[];
    top: number;
    bottom: number;
    left: number;
    right: number;
    centerCoord: { x: number; y: number };
    kind?: GameRoomKind;
};

export type RoomConnection = {
    idx: number; // valid only within the room
    connectTo: number; // Room idx
    x: number;
    y: number;
};

export { createGameSession, handleMapCommand, handleMoveCommand };

async function createGameSession(seed?: number): Promise<GameSession> {
    const session: GameSession = {
        map: createGameMap(seed),
        state: {
            currentRoomIndex: 0,
            visitedRoomIndices: [0],
            visitedRoomKinds: { Normal: [-1] },
        },
        option: {
            scaleValue: 10,
        },
        mapBuffer: Buffer.from([]),
    };
    await renderMapBuffer(session);
    return session;
}

async function handleMapCommand(session: GameSession, interaction: ChatInputCommandInteraction) {
    const currentRoom = getCurrentRoom(session);
    const activeConnectsStr = currentRoom.connections.map((c) => c.idx).join(',');
    const roomName = currentRoom.idx === 0 ? 'Start' : currentRoom.kind;

    await interaction.editReply({
        content: `You are now in ${roomName} room. From here, you can move to ${activeConnectsStr}.`,
        files: [{ attachment: session.mapBuffer, name: 'map.png' }],
    });
}

async function handleMoveCommand(session: GameSession, interaction: ChatInputCommandInteraction) {
    const connectIdx = interaction.options.getInteger('connect-idx')!;

    const nextRoomIdx = getCurrentRoom(session).connections[connectIdx].connectTo;
    session.state.currentRoomIndex = nextRoomIdx;
    const isVisited = isVisitedRoom(session, nextRoomIdx);

    session.state.visitedRoomIndices.push(nextRoomIdx);
    session.state.visitedRoomIndices = [...new Set(session.state.visitedRoomIndices)];

    const currentRoom = getCurrentRoom(session);
    if (!isVisited) {
        currentRoom.kind = rollRoomDice(session);
    }
    await renderMapBuffer(session);

    const roomName = currentRoom.idx === 0 ? 'Start' : currentRoom.kind;
    const activeConnectsStr = currentRoom.connections.map((c) => c.idx).join(',');

    await interaction.editReply({
        content: `You've entered ${roomName} room. From here, you can move to ${activeConnectsStr}.`,
        files: [{ attachment: session.mapBuffer, name: 'map.png' }],
    });
}
