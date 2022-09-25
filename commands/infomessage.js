const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('infomessage')
		.setDescription('Posts a pre-determined info message into the current channel.')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(interaction) {
		const InfoEmbed = new EmbedBuilder()
			.setColor(0x03a9f4)
			.setTitle('Welcome to Memespeak!')
			.setDescription('Here you can find the server rules, as well as assign yourself roles that will unlock various text channels.')
			.setImage('https://i.imgur.com/JXOMp3o.jpg');

		await interaction.channel.send({ embeds: [InfoEmbed] });
		await interaction.reply({ content: `Info message sent in ${interaction.channel}.`, ephemeral: true });
	},
};