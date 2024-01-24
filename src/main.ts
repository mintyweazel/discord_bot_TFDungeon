import { Client, Events, GatewayIntentBits } from 'discord.js';
import { DISCORD_TOKEN } from './config';
import { syncSlashCommands } from './commands';
import { createGameSession, handleMoveCommand, handleMapCommand, GameSession } from './game/game';

const client = new Client({
    // closeTimeout: 1000 * 10,
    intents: Object.values(GatewayIntentBits).reduce(
        (a: any, b: any) => a | b,
    ) as GatewayIntentBits,
});

let session: GameSession;

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// client.on(Events.MessageCreate, async (msg) => {
//     if (msg.content === '1d25') {
//         msg.reply('Pong!');
//     }
// });

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    try {
        switch (commandName) {
            case 'map': {
                await interaction.deferReply();
                await handleMapCommand(session, interaction);
                break;
            }
            case 'move': {
                await interaction.deferReply();
                await handleMoveCommand(session, interaction);
                break;
            }
            default:
                break;
        }
    } catch (error) {
        console.error(error);
        await interaction.reply(`We got errors in server-side!`);
    }
});

(async () => {
    session = await createGameSession();

    syncSlashCommands();

    await client.login(DISCORD_TOKEN);
})();
