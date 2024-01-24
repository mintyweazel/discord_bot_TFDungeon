import { GameSession, GameMap, GameRoom, GameRoomKind } from './game';
import { diceRoll } from './utils';

import * as ROT from 'rot-js';
import * as assert from 'assert';

export {
    //
    createGameMap,
    rollRoomDice,

    //
    getCurrentRoom,
    getRoomIconForKind,
    setRoomsVisited,
    isVisitedRoom,
    withinRoom,

    //
    getScaledPoint,
    getScaledRoomCenter,
};

function createGameMap(seed?: number): GameMap {
    const mapWidth = 70;
    const mapHeight = 40;

    ROT.RNG.setSeed(seed ? seed : 1234);
    const rawMapData = new ROT.Map.Digger(mapWidth, mapHeight, {
        // roomWidth: [mapWidth * 0.06, mapWidth * 0.14],
        // roomHeight: [mapHeight * 0.06, mapHeight * 0.14],
        // [XXX] Disable corridors, or the map can have the dead ends.
        corridorLength: [0, 0],
    }).create(() => {});

    const rooms: GameRoom[] = [];
    const doorCoords: { x: number; y: number }[] = [];
    const doorCoordsMap: Record<string, number[]> = {};
    for (const [idx, rawRoom] of rawMapData.getRooms().entries()) {
        // doors
        for (const doorCoord of Object.keys(rawRoom._doors)) {
            if (doorCoordsMap[doorCoord]) {
                doorCoordsMap[doorCoord].push(idx);
            } else {
                doorCoordsMap[doorCoord] = [idx];
            }

            const [doorX, doorY] = doorCoord.split(',').map((d) => parseInt(d));
            doorCoords.push({ x: doorX, y: doorY });
        }

        // room info
        rooms.push({
            idx: idx,
            connections: [],
            top: rawRoom.getTop(),
            bottom: rawRoom.getBottom(),
            left: rawRoom.getLeft(),
            right: rawRoom.getRight(),
            centerCoord: { x: rawRoom.getCenter()[0], y: rawRoom.getCenter()[1] },
        });
    }

    // room connection
    for (const [idx, room] of rooms.entries()) {
        for (const [doorCoordStr, roomIds] of Object.entries(doorCoordsMap)) {
            if (!roomIds.includes(idx)) {
                continue;
            }

            const [doorX, doorY] = doorCoordStr.split(',').map((d) => parseInt(d));

            const connectedRoomIds = roomIds.filter((r) => r != idx);
            // [TODO] We should validate the map creation first. Then we can skip this check.
            assert.deepEqual(connectedRoomIds.length, 1);

            const connectionIdx = room.connections.length;

            room.connections.push({
                idx: connectionIdx,
                connectTo: connectedRoomIds[0],
                x: doorX,
                y: doorY,
            });
        }
    }

    return { width: rawMapData._width, height: rawMapData._height, rooms, doorCoords };
}

// [TODO] We need tests!
function rollRoomDice(session: GameSession): GameRoomKind {
    function treatNormal(_session: GameSession): GameRoomKind {
        return 'Normal';
    }

    function treat(
        _session: GameSession,
        _diceValue: number,
        kind: GameRoomKind,
        options: { onlyOnce: boolean } = { onlyOnce: true },
    ): GameRoomKind {
        if (!session.state.visitedRoomKinds[kind]) {
            session.state.visitedRoomKinds[kind] = [_diceValue];
            return kind;
        } else {
            if (!options.onlyOnce) {
                const oldDiceValues = session.state.visitedRoomKinds[kind]!;
                if (!oldDiceValues.includes(_diceValue)) {
                    session.state.visitedRoomKinds[kind]!.push(_diceValue);
                    return kind;
                }
            }

            return treatNormal(_session);
        }
    }

    const diceValue = diceRoll(1, 25);

    if ([1, 2].includes(diceValue)) {
        return treat(session, diceValue, 'RedDoor');
    } else if ([3, 4].includes(diceValue)) {
        return treat(session, diceValue, 'Shop');
    } else if ([5, 6].includes(diceValue)) {
        return treat(session, diceValue, 'HotSpring');
    } else if ([7, 8].includes(diceValue)) {
        return treat(session, diceValue, 'Diner');
    } else if ([9].includes(diceValue)) {
        return treat(session, diceValue, 'Forest');
    } else if ([10].includes(diceValue)) {
        return treat(session, diceValue, 'Beach');
    } else if ([11, 12].includes(diceValue)) {
        return treat(session, diceValue, 'Library', { onlyOnce: false });
    } else if ([13, 14, 15].includes(diceValue)) {
        return treat(session, diceValue, 'Bed', { onlyOnce: false });
    } else if ([16].includes(diceValue)) {
        return treat(session, diceValue, 'Circus');
    } else if ([17].includes(diceValue)) {
        return treat(session, diceValue, 'TreasureBox');
    } else {
        return treatNormal(session);
    }
}

function getCurrentRoom(session: GameSession): GameRoom {
    return session.map.rooms[session.state.currentRoomIndex];
}

function getRoomIconForKind(roomKind?: GameRoomKind): string {
    switch (roomKind) {
        case 'HotSpring':
            return '♨️';
        case 'Diner':
            return '🍽️';
        case 'Forest':
            // 🏞️🏕️🌲⛰️
            return '🌲';
        case 'Shop':
            // 🏪🛒
            return '🛒';
        case 'Beach':
            // 🏝️⛱️🌊
            return '🌊';
        case 'Bed':
            // 🛏🏨🏩
            return '🛏';
        case 'Library':
            // 📖🏛
            return '📖';
        case 'Circus':
            return '🎪';
        case 'TreasureBox':
            // 🕋🎁
            return '🎁';
        case 'RedDoor':
            return '🚪';
        case 'Normal':
        default:
            return '';
    }
}

function setRoomsVisited(session: GameSession, visitedRoomIndices?: number[]) {
    if (visitedRoomIndices) {
        session.state.visitedRoomIndices =
            session.state.visitedRoomIndices.concat(visitedRoomIndices);
    } else {
        session.state.visitedRoomIndices = session.state.visitedRoomIndices.concat(
            session.map.rooms.map((r) => r.idx),
        );
    }
}

function isVisitedRoom(session: GameSession, roomIdx: number): boolean {
    return session.state.visitedRoomIndices.includes(roomIdx);
}

function withinRoom(session: GameSession, x: number, y: number): { res: boolean; roomId: number } {
    for (const room of session.map.rooms) {
        if (room.left <= x && x <= room.right) {
            if (room.top <= y && y <= room.bottom) {
                return { res: true, roomId: room.idx };
            }
        }
    }
    return { res: false, roomId: -1 };
}

function getScaledPoint(
    point: { x: number; y: number },
    scaleValue: number,
): { x: number; y: number } {
    // [XXX] We except scaleValue be integer!

    const left = point.x * scaleValue;
    const right = -1 + left + 1 * scaleValue;
    const top = point.y * scaleValue;
    const bottom = -1 + top + 1 * scaleValue;

    return { x: Math.floor((left + right) * 0.5), y: Math.floor((top + bottom) * 0.5) };
}

function getScaledRoomCenter(room: GameRoom, scaleValue: number): { x: number; y: number } {
    const left = room.left * scaleValue;
    const right = -1 + left + (room.right - room.left + 1) * scaleValue;
    const top = room.top * scaleValue;
    const bottom = -1 + top + (room.bottom - room.top + 1) * scaleValue;

    return { x: Math.floor((left + right) * 0.5), y: Math.floor((top + bottom) * 0.5) };
}
