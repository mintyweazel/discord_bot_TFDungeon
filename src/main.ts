import { Client, Events, GatewayIntentBits } from 'discord.js';
import { DISCORD_TOKEN } from './config';
import { syncSlashCommands } from './commands';

const client = new Client({
    intents: Object.values(GatewayIntentBits).reduce(
        (a: any, b: any) => a | b,
    ) as GatewayIntentBits,
});

syncSlashCommands();

client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// client.on(Events.MessageCreate, async (msg) => {
//     if (msg.content === '1d25') {
//         msg.reply('Pong!');
//     }
// });

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand()) return;
    // if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    switch (commandName) {
        case 'map': {
            await interaction.reply('/map: Not implemented yet!');
            break;
        }
        default:
            break;
    }
});

client.login(DISCORD_TOKEN);
