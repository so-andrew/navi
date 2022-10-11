const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, User, time } = require('discord.js');
const { RoleAssignment } = require('../schemas/roleassignments.js');
const { Points } = require('../schemas/points.js');
const { Prediction } = require('../schemas/predictionschema.js');
const user = require('../commands/user.js');
const points = require('../schemas/points.js');

module.exports = {
	name: 'interactionCreate',
	async execute(interaction) {
		console.log(`${interaction.user.tag} in #${interaction.channel.name} triggered an interaction.`);
		if (!interaction.isChatInputCommand() && !interaction.isSelectMenu() && !interaction.isModalSubmit() && !interaction.isButton()) return;

		if (interaction.isChatInputCommand()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) return;

			try {
				await command.execute(interaction);
			} catch (error) {
				console.error(error);
				await interaction.reply({ content: 'Error executing this command.', ephemeral: true });
			}
		} else if (interaction.isSelectMenu()) {
			console.log(interaction.values);

			if (interaction.customId === 'selectRole') {
				const allRoles = await interaction.guild.roles.fetch();
				const allChannels = await interaction.guild.channels.fetch();
				const channelsAdded = [];
				const member = interaction.member;

				await interaction.values.forEach(async (channelId) => {
					const channel = allChannels.find(e => e.id === channelId);
					channelsAdded.push(channel.toString());
					const dbEntry = await RoleAssignment.findOne({ channelId: channelId }).exec();
					const roleId = dbEntry.roleId;
					const role = allRoles.find(e => e.id === roleId);
					member.roles.add(role);
				});

				await interaction.reply({ content: `You can now access the following channels: ${channelsAdded.join(', ')}`, ephemeral: true });
			} else if (interaction.customId === 'removeRole') {
				const allRoles = await interaction.guild.roles.fetch();
				const allChannels = await interaction.guild.channels.fetch();
				const channelsRemoved = [];
				const member = interaction.member;

				interaction.values.forEach(async (channelId) => {
					const channel = allChannels.find(e => e.id === channelId);
					channelsRemoved.push(channel.toString());
					const dbEntry = await RoleAssignment.findOne({ channelId: channelId }).exec();
					const roleId = dbEntry.roleId;
					const role = await allRoles.find(e => e.id === roleId);
					member.roles.remove(role);
				});

				await interaction.reply({ content: `You can no longer access the following channels: ${channelsRemoved.join(', ')}.`, ephemeral: true });
			}
		} else if (interaction.isModalSubmit()) {
			if (interaction.customId === 'pollCreateModal') {
				const pollMessage = await interaction.channel.send({ content: 'Creating poll, one moment...' });
				const poll = {
					guildId: interaction.guildId,
					messageId: pollMessage.id,
					title: interaction.fields.getTextInputValue('pollTitleInput'),
					choice1: interaction.fields.getTextInputValue('pollChoice1Input'),
					choice1_points: 0,
					choice2: interaction.fields.getTextInputValue('pollChoice2Input'),
					choice2_points: 0,
					startDate: interaction.createdTimestamp,
					endDate: interaction.createdTimestamp + 1000 * 60 * 5,
					closed: false,
				};
				console.log(poll);
				const res = await Prediction.insertMany(poll);
				console.log(res[0].guildId ? 'Successfully created database entry.' : 'Failed to connect to database.');

				const embed = new EmbedBuilder()
					.setTitle(poll.title)
					.setDescription(`**${poll.choice1}** (${poll.choice1_points} pts)\n**${poll.choice2}** (${poll.choice2_points} pts)`)
					.setFooter({ text: `Closes ${time(poll.endDate)}`});

				const row = new ActionRowBuilder()
					.addComponents(
						new ButtonBuilder()
							.setCustomId(`p_${poll.messageId}_choice1`)
							.setLabel(`${poll.choice1}`)
							.setStyle(ButtonStyle.Primary),
						new ButtonBuilder()
							.setCustomId(`p_${poll.messageId}_choice2`)
							.setLabel(`${poll.choice2}`)
							.setStyle(ButtonStyle.Secondary),
					);

				await pollMessage.edit({ content: '', embeds: [embed], components: [row] });
				await interaction.reply({ content: `Poll created:\nhttps://discord.com/channels/${pollMessage.guild.id}/${pollMessage.channel.id}/${pollMessage.id}`, ephemeral: true });
			}
		} else if (interaction.isButton()) {
			await interaction.deferReply({ ephemeral: true });
			const identifiers = interaction.customId.split('_');
			if (identifiers[0] === 'p') {
				// Find poll
				const pollId = identifiers[1];
				const pollChoice = identifiers[2];
				const pollDbEntry = await Prediction.findOne({ messageId: pollId });
				if (!pollDbEntry) {
					console.log('No such poll.');
					await interaction.editReply('Something went wrong.');
					return;
				}
				// If poll has been set to closed
				if (pollDbEntry.closed) {
					await interaction.editReply('This poll has been closed.');
					return;
				}
				// If poll has not yet been set to closed but should be (automatic closure)
				if (pollDbEntry.endDate < Date.now()) {
					if (!pollDbEntry.closed) {
						const res = await Prediction.updateOne({ 'messageId': pollId }, { $set: { 'closed': true } });
						console.log(`${res.modifiedCount} database(s) modified.`);
					}
					await interaction.editReply('This poll has been closed.');
					return;
				}

				//console.log(pollDbEntry);

				let userVotedInPoll;
				if (pollDbEntry.users) {
					userVotedInPoll = pollDbEntry.users.get(interaction.user.id);
				}
				console.log(userVotedInPoll);
				if (userVotedInPoll && userVotedInPoll.choice !== pollChoice) {
					await interaction.editReply('You have already voted for the opposite outcome.');
					return;
				}

				const userPointsDBEntry = await Points.findOne({ guildId: interaction.guildId, userId: interaction.user.id });
				if (!userPointsDBEntry) {
					await interaction.editReply('You have yet to opt into receiving and spending server points, please use the `/points` command.');
					return;
				}
				
				interaction.editReply({ content: 'Check your DMs to continue! '})
					.then(async () => {
						await interaction.user.send({ content: `How many points do you want to bet? (Reply with a number within 30 seconds to continue)\n\n**Poll Title**: ${pollDbEntry.title}\n**Your Choice**: ${pollDbEntry[pollChoice]}` });
						const DMChannel = await interaction.user.dmChannel.fetch();
				
						DMChannel.awaitMessages({ max: 1, time: 30_000, errors: ['time'] })
							.then(async collected => {
								// console.log(collected);
								for (const message of collected.values()){
									//console.log(message);
									const pointsBet = parseInt(message.content, 10);
									if (Number.isInteger(pointsBet)) {
										if (pointsBet <= 0) {
											DMChannel.send('Number must be a positive integer.');
											return;
										}
										if (userPointsDBEntry.points === 0) {
											await DMChannel.send('You have no points to spend. Please wait until the next daily point assignment.');
											return;
										}
										if (userPointsDBEntry.points < pointsBet) {
											await DMChannel.send(`You only have \`${userPointsDBEntry.points}\` points to spend. Would you like to spend all of them? (Reply Y/N within 30 seconds to continue)`);
											const ynFilter = m => !m.author.bot && (m.content.toLowerCase() === 'y' || m.content.toLowerCase() === 'n');
											DMChannel.awaitMessages({ ynFilter, max: 1, time: 30_000, errors: ['time'] })
												.then(async collected1 => {
													for (const message of collected1.values()) {
														console.log(message);
														if (message.content.toLowerCase() === 'y'){
															const res = await Points.updateOne({ guildId: interaction.guildId, userId: interaction.user.id }, { $set: { points: 0 }});
															console.log(`${res.modifiedCount} document(s) updated.`);
														} else {
															DMChannel.send('Acknowleged. If you still wish to vote, please return to the poll.');
															return;
														}
													}
												})
												.catch(collected => {
													DMChannel.send('Interaction has timed out. If you still wish to vote, please return to the poll.');
												})
										} else {
											// Update user's points
											const currentPoints = userPointsDBEntry.points;
											const res = await Points.updateOne({ guildId: interaction.guildId, userId: interaction.user.id }, { $set: { points: currentPoints - pointsBet }});
											console.log(`${res.modifiedCount} document(s) updated.`);

											// Update poll database entry to track votes
											let newUserPoints;
											if (pollDbEntry.users && pollDbEntry.users.get(interaction.user.id)) {
												newUserPoints = pollDbEntry.users.get(interaction.user.id).points + pointsBet;
											} else {
												newUserPoints = pointsBet;
											}

											let currentPointTotal;
											if (pollChoice === 'choice1') {
												currentPointTotal = pollDbEntry.choice1_points;
												let newPointTotal = currentPointTotal + parseInt(pointsBet, 10);
												const pollDbRes = await Prediction.updateOne({ messageId: pollId }, { $set: { [`users.${interaction.user.id}`]: {
													choice: pollChoice,
													points: newUserPoints,  
												}, choice1_points: newPointTotal }});
												console.log('Updated poll database.', pollDbRes);
											} else {
												currentPointTotal = pollDbEntry.choice2_points;
												let newPointTotal = currentPointTotal + parseInt(pointsBet, 10);
												const pollDbRes = await Prediction.updateOne({ messageId: pollId }, { $set: { [`users.${interaction.user.id}`]: {
													choice: pollChoice,
													points: newUserPoints,  
												}, choice2_points: newPointTotal }});
												console.log('Updated poll database.', pollDbRes);
											}

											const newPollDbEntry = await Prediction.findOne({ messageId: pollId });
											// Update original poll message
											const embed = new EmbedBuilder()
												.setTitle(newPollDbEntry.title)
												.setDescription(`**${newPollDbEntry.choice1}** (${newPollDbEntry.choice1_points} pts)\n**${newPollDbEntry.choice2}** (${newPollDbEntry.choice2_points} pts)`)
												.setFooter({ text: `Closes at (time string)`});
												
											const pollMessage = interaction.channel.messages.cache.get(newPollDbEntry.messageId);
											pollMessage.edit({ embeds: [embed] });

											DMChannel.send(`You bet \`${pointsBet}\` points on \`${newPollDbEntry[pollChoice]}\`. You now have \`${currentPoints - pointsBet}\` points remaining.`);
											return;
										}
										return;
									} else {
										interaction.user.send('Please enter a valid positive integer.');
										return;
									}
								}
							})
							.catch(collected => {
								console.log(collected);
								DMChannel.send('Interaction has timed out. If you still wish to vote, please return to the poll.');
								return;
							});
					});
			}
		}
	},
};