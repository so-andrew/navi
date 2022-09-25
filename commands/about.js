const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('about')
		.setDescription('About message for NAVI.'),
	async execute(interaction) {
		const BotInfoEmbed = new EmbedBuilder()
			.setColor(0x0ea9f4)
			.setTitle('NAVI')
			.setDescription('A Discord bot for managing small servers. More functionality coming soon.')
			.addFields(
				{ name: 'Created By', value: '<@197598081867448320>' },
			)
			.setImage(`${interaction.client.user.avatarURL()}`);
		await interaction.reply({ embeds: [BotInfoEmbed] });
	},
};
