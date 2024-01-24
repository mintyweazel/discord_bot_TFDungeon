import { GameSession } from './game';
import * as fs from 'fs';

export { diceRoll, writeSessionToFile };

function diceRoll(num: number, sided: number, delta?: number): number {
    function randRange(min: number, max: number): number {
        const _min = Math.ceil(min);
        const _max = Math.floor(max);
        return Math.floor(Math.random() * (_max - _min + 1) + _min);
    }

    const _delta = delta ? delta : 0;
    return [...Array(num)].map(() => randRange(1, sided)).reduce((acc, n) => acc + n, _delta);
}

async function writeSessionToFile(session: GameSession, filePath: string) {
    const replacer = (excludeKeys: string[]) => {
        return (key: string, value: any) => {
            if (excludeKeys.includes(key)) {
                return undefined;
            }
            return value;
        };
    };
    await fs.promises.writeFile(
        filePath,
        JSON.stringify(session, replacer(['doorCoords', 'mapBuffer']), 2),
    );
}
