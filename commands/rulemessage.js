const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('rulemessage')
		.setDescription('Posts a pre-determined rules message into the current channel.')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(interaction) {
		const RulesEmbed = new EmbedBuilder()
			.setColor(0x03a9f4)
			.setTitle('Rules')
			.setDescription('1) This server is **not** open-invite. Please ask before you extend an invitation to someone. New server members will be handled on a case-by-case basis.\n\n2) **Adhere to the Golden Rule**, i.e. treat others the way that you want to be treated. If you flame, expect to get flamed. At the same time, if something bothers you, speak up.\n\n3) **Please use spoiler tags** when discussing new presentations and trailers. This applies to gaming, movies, and other forms of media. Examples include but are not limited to:\n- Nintendo Directs\n- Apple presentations\n- MCU trailers\n\n4) **Content that violates the Discord TOS will be removed**. In addition, **no gore/shock content** is allowed. Most other things are fair game as long as they are posted in relevant channels, but consider using spoiler tags depending on the content.\n\nThis document will be updated as needed.')
			.setFooter({ text: 'Current revision: v1.0 (February 27, 2022)' });

		interaction.channel.send({ embeds: [RulesEmbed] });
		await interaction.reply({ content: `Rules message sent in ${interaction.channel}.`, ephemeral: true });
	},
};