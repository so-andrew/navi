const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('server')
		.setDescription('Replies with server info.')
		.setDMPermission(false),
	async execute(interaction) {
		const serverOwner = await interaction.guild.fetchOwner();
		const ownerMention = serverOwner.toString();

		const ServerInfoEmbed = new EmbedBuilder()
			.setColor(0x03a9f4)
			.setTitle(`${interaction.guild.name}`)
			.addFields(
				{ name: 'Date Created', value: interaction.guild.createdAt.toLocaleDateString() },
				{ name: 'Members', value: `${interaction.guild.memberCount}`, inline: true },
				{ name: 'Channels', value: `${interaction.guild.channels.channelCountWithoutThreads}`, inline: true },
				{ name: 'Server Owner', value: `${ownerMention}` },
			)
			.setImage(`${interaction.guild.iconURL()}`);
		await interaction.reply({ embeds: [ServerInfoEmbed] });
	},
};