const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('about')
		.setDescription('About message for NAVI.'),
	async execute(interaction) {
		const BotInfoEmbed = new EmbedBuilder()
			.setColor(0x0ea9f4)
			.setTitle('NAVI - Knowledge Navigator')
			.setDescription('A Discord bot for managing small servers, made using the Discord.js library.\n\nCurrent functionality includes:\n\n- Displaying server/user information\n- Managing roles for members in order to access private channels\n- League of Legends rank lookup and daily leaderboard\n- Twitch-style predictions with points betting\n- Bulk deleting messages in a channel\n\nMore functionality coming soon.')
			.addFields(
				{ name: 'Created By', value: '<@197598081867448320>', inline: true },
				{ name: 'GitHub Repository', value: 'https://github.com/so-andrew/navi/', inline: true },
			)
			.setImage('https://i.imgur.com/rBqi2SX.png');
		await interaction.reply({ embeds: [BotInfoEmbed] });
	},
};
