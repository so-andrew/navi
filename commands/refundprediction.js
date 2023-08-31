const { ContextMenuCommandBuilder, ApplicationCommandType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const logger = require('../logger.js');
const { Points } = require('../schemas/points.js');
const { Prediction } = require('../schemas/predictionschema.js');
const { ServerSettings } = require('../schemas/serversettings.js');

module.exports = {
	data: new ContextMenuCommandBuilder()
		.setName('Refund Prediction')
		.setType(ApplicationCommandType.Message)
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true });
		const pollDbEntry = await Prediction.findOne({ messageId: interaction.targetMessage.id });
		// Message is not a poll
		if (!pollDbEntry) {
			await interaction.editReply('This message does not contain a prediction.');
			return;
		}
		// Poll is not yet closed
		if(!pollDbEntry.closed) {
			await interaction.editReply('This prediction has not yet been closed.');
			return;
		} 

		// Get server currency name
		const serverSettingsEntry = await ServerSettings.findOne({ guildId: interaction.guildId });
		let currencyName;
		if (!serverSettingsEntry || !serverSettingsEntry.currencyName) {
			currencyName = 'server point';
		} else {
			currencyName = serverSettingsEntry.currencyName;
		}

		//const filter = m => m.author.id === interaction.user.id;

		const updatedPollDbEntry = await Prediction.findOne({ messageId: interaction.targetMessage.id });

		// If no one voted
		if (!updatedPollDbEntry.users) {
			const outcomeEmbed = new EmbedBuilder()
				.setTitle('Final Results')
				.setDescription('Looks like no one voted this time.')
				.addFields({ name: 'Prediction Title', value: `${updatedPollDbEntry.title}` })
				.addFields({ name: `Points for ${updatedPollDbEntry.choice1}`, value: `${updatedPollDbEntry.choice1_points}`, inline: true })
				.addFields({ name: `Points for ${updatedPollDbEntry.choice2}`, value: `${updatedPollDbEntry.choice2_points}`, inline: true });

			await interaction.channel.send({ embeds: [outcomeEmbed] });
			await interaction.editReply('No one voted on this prediction.');
			return;
		}

		const refundPoints = async (votes) => {
			const requests = votes.map(async (vote) => {

				let payout = vote[1].points;
				logger.info(vote[0], payout);
				let member = interaction.guild.members.cache.get(vote[0]);
				if (!member) {
					member = interaction.guild.members.fetch(vote[0]);
				}
				const user = member.user;

				const userPointsDBEntry = await Points.findOne({ guildId: interaction.guildId, userId: vote[0] });
				const newPoints = userPointsDBEntry.points + payout;

				const pointsEmbed = new EmbedBuilder()
					.setColor(0x03a9f4)
					.setDescription(`You have been refunded **${payout}** points.\n You now have **${newPoints}** ${currencyName}s.`)
					.setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
					.addFields({ name: 'Prediction Title', value: `${updatedPollDbEntry.title}` })
					.addFields({ name: 'Outcome', value: 'Refunded' })
					.setTimestamp();

				await user.send({ embeds: [pointsEmbed] });
				return Points.updateOne({ guildId: interaction.guildId, userId: vote[0] }, { $inc: { points: payout } });
			});

			await Promise.all(requests);
		};
		
		const pollVotes = updatedPollDbEntry.users.entries();
		let pollVotesArray = Array.from(pollVotes);
		await refundPoints(pollVotesArray);

		const outcomeEmbed = new EmbedBuilder()
			.setTitle('Prediction Refunded')
			.setDescription(`This poll has been refunded. ${updatedPollDbEntry.choice1_points + updatedPollDbEntry.choice2_points} ${currencyName}s have been refunded to the original bettors.`)
			.addFields({ name: 'Prediction Title', value: `${updatedPollDbEntry.title}` })
			.addFields({ name: `Points for ${updatedPollDbEntry.choice1}`, value: `${updatedPollDbEntry.choice1_points}`, inline: true })
			.addFields({ name: `Points for ${updatedPollDbEntry.choice2}`, value: `${updatedPollDbEntry.choice2_points}`, inline: true });

		await interaction.channel.send({ embeds: [outcomeEmbed] });
		await interaction.editReply('Prediction refunded.');
		return;
	}
};