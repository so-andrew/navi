const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { ServerSettings } = require('../schemas/serversettings');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('setpointname')
		.setDescription('Sets the name of the server points currency.')
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addStringOption(option => 
			option.setName('name')
				.setDescription('The name of the currency (singular)')
				.setRequired(true)),
	async execute(interaction) {
		await interaction.deferReply();
		const currencyName = interaction.options.getString('name');
		await this.updateServerSettings(interaction, currencyName);
		await interaction.editReply(`Server currency name set to ${currencyName}.`);
	},
	async updateServerSettings(interaction, currencyName) {
		const serverSettingsEntry = await ServerSettings.findOne({ guildId: interaction.guildId });
		if (serverSettingsEntry) {
			const res = await ServerSettings.updateOne({ guildId: interaction.guildId }, { $set: { currencyName: currencyName } });
			console.log(`${res.modifiedCount} document(s) updated.`);
		} else {
			const newServerSettingsEntry = {
				guildId: interaction.guildId,
				currencyName: currencyName,
			};
			const res = await ServerSettings.insertMany(newServerSettingsEntry);
			console.log(res[0].guildId ? 'Successfully created database entry.' : 'Failed to connect to database.');
		}
	},
};