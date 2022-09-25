const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('delete')
		.setDescription('Deletes a given number of messages in the current channel.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
		.addIntegerOption(option => option.setName('int')
			.setDescription('The number of messages to delete')
			.setRequired(true)),
	async execute(interaction) {
		const channel = interaction.channel;
		const numToDelete = interaction.options.getInteger('int');
		if (numToDelete <= 0) {
			await interaction.reply('Please enter a valid number.');
			return;
		}
		const deleted = await channel.bulkDelete(numToDelete);
		await interaction.reply({ content: `Deleted ${deleted.size} messages.`, ephemeral: true });
	},
};