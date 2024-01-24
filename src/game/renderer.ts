import sharp from 'sharp';

import { GameSession } from './game';

import {
    withinRoom,
    getScaledPoint,
    getScaledRoomCenter,
    getRoomIconForKind,
    getCurrentRoom,
} from './map';

import { GlobalFonts, createCanvas, ImageData, loadImage } from '@napi-rs/canvas';
import * as fs from 'fs';
import * as path from 'path';

GlobalFonts.registerFromPath(
    path.join(__dirname, '../../fonts/Noto_Color_Emoji/NotoColorEmoji-Regular.ttf'),
    'NotoColorEmoji',
);

export { renderMapBuffer, paintMap, drawMap, writeMapToFile };

async function renderMapBuffer(session: GameSession) {
    session.mapBuffer = await drawMap(session, await paintMap(session));
}

async function paintMap(session: GameSession): Promise<Buffer> {
    const canvas = createCanvas(session.map.width, session.map.height);
    const ctx = canvas.getContext('2d');

    const imageData = ctx.getImageData(0, 0, session.map.width, session.map.height);

    // Paint Rooms
    for (let y = 0; y < imageData.height; y++) {
        for (let x = 0; x < imageData.width; x++) {
            let cellColor = [200, 200, 200, 255];
            const { res, roomId } = withinRoom(session, x, y);
            if (res) {
                if (roomId === session.state.currentRoomIndex) {
                    cellColor = [10, 150, 150, 255];
                } else if (session.state.visitedRoomIndices.includes(roomId)) {
                    cellColor = [10, 10, 10, 255];
                }
            }
            setImageData(imageData, x, y, cellColor);
        }
    }

    // [XXX] Paint doors after painting the rooms
    for (const room of session.map.rooms) {
        if (session.state.visitedRoomIndices.includes(room.idx)) {
            for (const connection of room.connections) {
                setImageData(imageData, connection.x, connection.y, [200, 10, 10, 255]);
            }
        }
    }

    ctx.putImageData(imageData, 0, 0);

    return await sharp(await canvas.encode('png'))
        .resize(
            session.map.width * session.option.scaleValue,
            session.map.height * session.option.scaleValue,
            {
                kernel: 'nearest',
            },
        )
        .toBuffer();
}

async function drawMap(session: GameSession, pngData: Buffer): Promise<Buffer> {
    const resizedImage = await loadImage(pngData);
    const canvas = createCanvas(resizedImage.width, resizedImage.height);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(resizedImage, 0, 0);

    const activeRooms = session.map.rooms.filter((r) => {
        return session.state.visitedRoomIndices.includes(r.idx);
    });

    // Draw room icon
    {
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        const fontSize = 10;
        ctx.font = `${fontSize}pt NotoColorEmoji`;
        for (const room of activeRooms) {
            const scaledPoint = getScaledRoomCenter(room, session.option.scaleValue);
            if (room.idx === 0) {
                ctx.font = `${fontSize}pt`;
                ctx.fillText('S', scaledPoint.x, scaledPoint.y + fontSize / 2);
                ctx.font = `${fontSize}pt NotoColorEmoji`;
            } else {
                const roomIcon = getRoomIconForKind(room.kind);
                if (roomIcon) {
                    ctx.strokeText(roomIcon, scaledPoint.x, scaledPoint.y + fontSize / 2);
                }
            }
        }
    }

    // Draw door number
    {
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        const fontSize = 8;
        ctx.font = `${fontSize}pt`;
        for (const conn of getCurrentRoom(session).connections) {
            const scaledPoint = getScaledPoint({ x: conn.x, y: conn.y }, session.option.scaleValue);
            ctx.fillText(String(conn.idx), scaledPoint.x + 1, scaledPoint.y + fontSize / 2 + 1);
        }
    }

    return await canvas.encode('png');
}

function setImageData(imageData: ImageData, x: number, y: number, color: number[]): void {
    const index = (y * imageData.width + x) * 4;
    imageData.data[index] = color[0]; // R
    imageData.data[index + 1] = color[1]; // G
    imageData.data[index + 2] = color[2]; // B
    imageData.data[index + 3] = color[3]; // A
}

async function writeMapToFile(pngData: Buffer, filePath: string) {
    await fs.promises.writeFile(filePath, pngData);
}
