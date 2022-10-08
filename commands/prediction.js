const { SlashCommandBuilder, ModalBuilder, PermissionFlagsBits, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('createprediction')
		.setDescription('Twitch-style predictions with points betting')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.setDMPermission(false),
	async execute(interaction) {
		const modal = new ModalBuilder()
			.setCustomId('pollCreateModal')
			.setTitle('Create Poll');

		const pollTitleInput = new TextInputBuilder()
			.setCustomId('pollTitleInput')
			.setLabel('Poll Title')
			.setStyle(TextInputStyle.Short)
			.setRequired(true);

		const pollChoice1Input = new TextInputBuilder()
			.setCustomId('pollChoice1Input')
			.setLabel('Choice 1')
			.setStyle(TextInputStyle.Short)
			.setRequired(true);

		const pollChoice2Input = new TextInputBuilder()
			.setCustomId('pollChoice2Input')
			.setLabel('Choice 2')
			.setStyle(TextInputStyle.Short)
			.setRequired(true);

		const actionRow1 = new ActionRowBuilder().addComponents(pollTitleInput);
		const actionRow2 = new ActionRowBuilder().addComponents(pollChoice1Input);
		const actionRow3 = new ActionRowBuilder().addComponents(pollChoice2Input);

		modal.addComponents(actionRow1, actionRow2, actionRow3);
		await interaction.showModal(modal);
	},
};