const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Points } = require('../schemas/points');
const { ServerSettings } = require('../schemas/serversettings');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('points')
		.setDescription('Check how many server points you have.')
		.setDMPermission(false)
		.addUserOption(option =>
			option.setName('user')
				.setDescription('The user to look up')
				.setRequired(false)),
	async execute(interaction) {
		await interaction.deferReply();
		const userSelected = interaction.options.getUser('user');
		let user;
		if (userSelected) {
			user = userSelected;
			if (user.bot) {
				await interaction.editReply('Bots cannot have server points.');
				return;
			}
		} else {
			user = interaction.user;
		}
		let member = await interaction.guild.members.cache.get(user.id);
		if (!member) {
			member = await interaction.guild.members.fetch(user.id);
		}

		const serverSettingsEntry = await ServerSettings.findOne({ guildId: interaction.guildId });
		let currencyName;
		if (!serverSettingsEntry || !serverSettingsEntry.currencyName) {
			currencyName = 'server point';
		} else {
			currencyName = serverSettingsEntry.currencyName;
		}

		const userPointsDBEntry = await Points.findOne({ guildId: interaction.guildId, userId: user.id });
		if (!userPointsDBEntry) {
			console.log('Creating new database entry...');
			const newPoints = {
				userId: user.id,
				userName: user.username,
				guildId: interaction.guildId,
				points: 1000,
			};
			const res = await Points.insertMany(newPoints);
			console.log(res[0].userId ? 'Successfully created database entry.' : 'Failed to connect to database.');

			const PointsEmbed = new EmbedBuilder()
				.setColor(0x03a9f4)
				.setDescription(`Congratulations, you now have **${newPoints.points}** ${currencyName}s!`)
				.setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
				.setTimestamp();

			await interaction.editReply({ embeds: [PointsEmbed] });
			return;
		} else {

			if (userPointsDBEntry.points !== 1) {
				currencyName += 's';
			}
			const PointsEmbed = new EmbedBuilder()
				.setColor(0x03a9f4)
				.setDescription(userSelected ? `${member.displayName} has **${userPointsDBEntry.points}** ${currencyName}.` : `You have **${userPointsDBEntry.points}** ${currencyName}.`)
				.setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
				.setTimestamp();

			await interaction.editReply({ embeds: [PointsEmbed] });
			return;
		}
	},
};