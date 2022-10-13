const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Points } = require('../schemas/points');

const placement = {
	1: ':first_place:',
	2: ':second_place:',
	3: ':third_place:',
};

module.exports = {
	data: new SlashCommandBuilder()
		.setName('pointsleaderboard')
		.setDescription('Displays a server point leaderboard.')
		.setDMPermission(false),
	async execute(interaction) {
		const usersToPrint = await Points.find({ guildId: interaction.guildId });
		
		usersToPrint.sort((e1, e2) => {
			if(e1.points === e2.points) {
				return 0;
			} else if (e1.points > e2.points) {
				return -1;
			} else return 1;
		});

		const output = [];
		let count = 1;
		for (const userPoints of usersToPrint) {
			let member = await interaction.guild.members.cache.get(userPoints.userId);
			if (!member) {
				member = await interaction.guild.members.fetch(userPoints.userId);
			}
			const user = member.user;
			output.push((count >= 1 && count <= 3) ? `${placement[count]} **${user.username}** (${userPoints.points} pts)` : `${count}. **${user.username}** (${userPoints.points} pts)`);
			count += 1;
		}
		let outputString = output.join('\n');

		const leaderboardEmbed = new EmbedBuilder()
			.setColor(0x03a9f4)
			.setTitle(`${interaction.guild.name} Points Leaderboard`)
			.setDescription(outputString)
			.setTimestamp();
		
		await interaction.reply({ embeds: [leaderboardEmbed] });
		return;
	}
};