const { ContextMenuCommandBuilder, ApplicationCommandType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const logger = require('../logger.js');
const { Points } = require('../schemas/points.js');
const { Prediction } = require('../schemas/predictionschema.js');
const { ServerSettings } = require('../schemas/serversettings.js');

module.exports = {
	data: new ContextMenuCommandBuilder()
		.setName('Prediction Outcome')
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

		const filter = m => m.author.id === interaction.user.id;
		await interaction.editReply({ content: 'Type `1` or `2` within 30 seconds to set the outcome of the prediction.'});
		interaction.channel.awaitMessages({ filter, max: 1, time: 30_000, errors: ['time'] })
			.then(async collected => {
				for(const message of collected.values()) {
					const outcome = parseInt(message.content, 10);
					if (isNaN(outcome)) {
						await interaction.editReply('Please enter a valid integer.');
						return;
					}
					switch(outcome) {
					case 1:
						await Prediction.updateOne({ messageId: interaction.targetMessage.id }, { $set: { outcome: 'choice1' }});
						await interaction.editReply(`Outcome set to ${pollDbEntry.choice1}.`);
						await message.delete();
						break;
					case 2:
						await Prediction.updateOne({ messageId: interaction.targetMessage.id }, { $set: { outcome: 'choice2' }});
						await interaction.editReply(`Outcome set to ${pollDbEntry.choice2}.`);
						await message.delete();
						break;
					default:
						await interaction.editReply('Number must be either `1` or `2`.');
						return;
					}
				}
				// Award points
				const updatedPollDbEntry = await Prediction.findOne({ messageId: interaction.targetMessage.id });

				// If no one voted
				if (!updatedPollDbEntry.users) {
					const outcomeEmbed = new EmbedBuilder()
						.setTitle('Final Results')
						.setDescription('Looks like no one voted this time.')
						.addFields({ name: 'Prediction Title', value: `${updatedPollDbEntry.title}`})
						.addFields({ name: `Points for ${updatedPollDbEntry.choice1}`, value: `${updatedPollDbEntry.choice1_points}`, inline: true })
						.addFields({ name: `Points for ${updatedPollDbEntry.choice2}`, value: `${updatedPollDbEntry.choice2_points}`, inline: true });

					await interaction.channel.send({ embeds: [outcomeEmbed] });
					return;
				}
				
				// Filter users who voted correctly
				const pollVotes = updatedPollDbEntry.users.entries();
				const correctVotes = Array.from(pollVotes).filter(([key, value]) => {
					return value.choice === updatedPollDbEntry.outcome;
				});


				// Return formula:
				// Winner gets: (WinTotalPoints+LoseTotalPoints) * (WinnerBetPoints/WinTotalPoints)

				const updatePoints = async (votes) => {
					const requests = votes.map(async (vote) => {
						let payout;
						logger.debug(`Current user: ${vote[0]}`);
						if (updatedPollDbEntry.outcome === 'choice1') {
							logger.debug('choice1_points: ', updatedPollDbEntry.choice1_points);
							logger.debug('choice2_points: ', updatedPollDbEntry.choice2_points);
							logger.debug('winnerBetPoints: ', vote[1].points);
							logger.debug('percentage: ', vote[1].points/updatedPollDbEntry.choice1_points);
							logger.debug('percentage floor: ', Math.floor(vote[1].points/updatedPollDbEntry.choice1_points));

							payout = Math.floor((updatedPollDbEntry.choice1_points + updatedPollDbEntry.choice2_points) * (vote[1].points/updatedPollDbEntry.choice1_points))
						} else {
							logger.debug('choice1_points: ', updatedPollDbEntry.choice1_points);
							logger.debug('choice2_points: ', updatedPollDbEntry.choice2_points);
							logger.debug('winnerBetPoints: ', vote[1].points);
							logger.debug('percentage: ', vote[1].points/updatedPollDbEntry.choice2_points);
							logger.debug('percentage floor: ', Math.floor(vote[1].points/updatedPollDbEntry.choice2_points));

							payout = Math.floor((updatedPollDbEntry.choice1_points + updatedPollDbEntry.choice2_points) * (vote[1].points/updatedPollDbEntry.choice2_points));
						}

						// const payout = updatedPollDbEntry.outcome === 'choice1' ? (updatedPollDbEntry.choice1_points + updatedPollDbEntry.choice2_points) * (Math.floor(vote[1].points/updatedPollDbEntry.choice1_points)) : (updatedPollDbEntry.choice1_points + updatedPollDbEntry.choice2_points) * (Math.floor(vote[1].points/updatedPollDbEntry.choice2_points));
						logger.info(`Payout for ${vote[0]}: ${payout}`);

						let member = interaction.guild.members.cache.get(vote[0]);
						if (!member) {
							member = interaction.guild.members.fetch(vote[0]);
						}
						const user = member.user;

						const userPointsDBEntry = await Points.findOne({ guildId: interaction.guildId, userId: vote[0] });
						const newPoints = userPointsDBEntry.points + payout;

						const pointsEmbed = new EmbedBuilder()
							.setColor(0x03a9f4)
							.setDescription(`Congratulations, you have earned **${payout}** ${currencyName}s!\n You now have **${newPoints}** ${currencyName}s.`)
							.setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
							.addFields({ name: 'Prediction Title', value: `${updatedPollDbEntry.title}`})
							.addFields({ name: 'Outcome', value: `${updatedPollDbEntry[updatedPollDbEntry.outcome]}` })
							.setTimestamp();

						await user.send({ embeds: [pointsEmbed] });
						return Points.updateOne({ guildId: interaction.guildId, userId: vote[0] }, { $inc: { points: payout }});
					});

					await Promise.all(requests);
				};
				await updatePoints(correctVotes);

				// Send message to losers
				const pollVotes2 = updatedPollDbEntry.users.entries();
				const incorrectVotes = Array.from(pollVotes2).filter(([key, value]) => {
					return value.choice !== updatedPollDbEntry.outcome;
				});

				const sendConsolationMessages = async (votes) => {
					const requests = votes.map(async (vote) => {
						let member = interaction.guild.members.cache.get(vote[0]);
						if (!member) {
							member = interaction.guild.members.fetch(vote[0]);
						}
						const user = member.user;

						const pointsEmbed = new EmbedBuilder()
							.setColor(0x03a9f4)
							.setDescription('Sorry, you did not predict correctly. Better luck next time!')
							.setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
							.addFields({ name: 'Prediction Title', value: `${updatedPollDbEntry.title}`})
							.addFields({ name: 'Outcome', value: `${updatedPollDbEntry[updatedPollDbEntry.outcome]}` })
							.setTimestamp();

						return user.send({ embeds: [pointsEmbed] });
					});

					await Promise.all(requests);
				};
				await sendConsolationMessages(incorrectVotes);

				const outcomeEmbed = new EmbedBuilder()
					.setTitle('Final Results')
					.setDescription(`**${updatedPollDbEntry[updatedPollDbEntry.outcome]}** wins! ${updatedPollDbEntry.choice1_points + updatedPollDbEntry.choice2_points} ${currencyName}s have been distributed to the winners.`)
					.addFields({ name: 'Prediction Title', value: `${updatedPollDbEntry.title}`})
					.addFields({ name: `Points for ${updatedPollDbEntry.choice1}`, value: `${updatedPollDbEntry.choice1_points}`, inline: true })
					.addFields({ name: `Points for ${updatedPollDbEntry.choice2}`, value: `${updatedPollDbEntry.choice2_points}`, inline: true });

				await interaction.channel.send({ embeds: [outcomeEmbed] });
				return;

			})
			.catch(async collected => {
				logger.debug(collected);
				await interaction.editReply('Interaction has timed out.');
				return;
			});
	}
};