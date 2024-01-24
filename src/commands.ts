import { SlashCommandBuilder, REST, Routes } from 'discord.js';
import { DISCORD_TOKEN, DISCORD_GUILD_ID, DISCORD_CLIENT_ID } from './config';

const slashCommands = [
    new SlashCommandBuilder().setName('map').setDescription('Show the dungeon map').toJSON(),
];

export async function syncSlashCommands() {
    try {
        const rest = new REST().setToken(DISCORD_TOKEN);

        console.log(`Started refreshing ${slashCommands.length} application (/) commands.`);

        // The put method is used to fully refresh all commands in the guild with the current set
        const data = await rest.put(
            Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID),
            {
                body: slashCommands,
            },
        );

        console.log(`Successfully reloaded ${(data as any[]).length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
}
