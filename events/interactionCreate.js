const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, } = require('discord.js');
const { RoleAssignment } = require('../schemas/roleassignments.js');
const { Points } = require('../schemas/points.js');
const { Prediction } = require('../schemas/predictionschema.js');
const { ServerSettings } = require('../schemas/serversettings.js');

const pollLengthMs = 1000 * 60 * 8;

module.exports = {
	name: 'interactionCreate',
	async execute(interaction) {
		console.log(`${interaction.user.tag} in #${interaction.channel.name} triggered an interaction.`);
		if (!interaction.isChatInputCommand() && !interaction.isSelectMenu() && !interaction.isModalSubmit() && !interaction.isButton() && !interaction.isMessageContextMenuCommand()) return;

		// Interaction is a slash command or context menu command
		if (interaction.isChatInputCommand() || interaction.isMessageContextMenuCommand()) {
			const command = interaction.client.commands.get(interaction.commandName);
			if (!command) return;

			try {
				await command.execute(interaction);
			} catch (error) {
				console.error(error);
				await interaction.reply({ content: 'Error executing this command.', ephemeral: true });
			}
		} 
		// Interaction is a select menu
		else if (interaction.isSelectMenu()) {
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
		} 
		// Interaction is a modal submit
		else if (interaction.isModalSubmit()) {
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
					endDate: interaction.createdTimestamp + pollLengthMs,
					closed: false,
				};
				const res = await Prediction.insertMany(poll);
				console.log(res[0].guildId ? 'Successfully created database entry.' : 'Failed to connect to database.');

				const endDate = new Date(poll.endDate);

				const embed = new EmbedBuilder()
					.setColor(0x03a9f4)
					.setTitle(poll.title)
					.setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
					.addFields({ name: `${poll.choice1}`, value: `${poll.choice1_points} pts`, inline: true })
					.addFields({ name: `${poll.choice2}`, value: `${poll.choice2_points} pts`, inline: true })
					.setFooter({ text: `Closes ${endDate.toLocaleString('en-US')}` });

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

				// Set automatic closure timeout
				setTimeout(this.closePoll, pollLengthMs, interaction, poll.messageId);

				await pollMessage.edit({ content: '', embeds: [embed], components: [row] });
				await interaction.reply({ content: `Poll created:\nhttps://discord.com/channels/${pollMessage.guild.id}/${pollMessage.channel.id}/${pollMessage.id}`, ephemeral: true });
			}
		}
		// Interaction is a button press 
		else if (interaction.isButton()) {
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

				// Check if user voted in poll, prevent voting for both outcomes
				let userVotedInPoll;
				if (pollDbEntry.users) {
					userVotedInPoll = pollDbEntry.users.get(interaction.user.id);
				}
				if (userVotedInPoll && userVotedInPoll.choice !== pollChoice) {
					await interaction.editReply('You have already voted for the opposite outcome.');
					return;
				}

				// Check if user has previously engaged with the points system
				const userPointsDBEntry = await Points.findOne({ guildId: interaction.guildId, userId: interaction.user.id });
				if (!userPointsDBEntry) {
					await interaction.editReply('You have yet to opt into receiving and spending server points, please use the `/points` command.');
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

				// Handle poll voting through DMs
				interaction.editReply({ content: 'Check your DMs to continue! '})
					.then(async () => {
						const bettingEmbed = new EmbedBuilder()
							.setColor(0x03a9f4)
							.setTitle('How many points do you want to bet?')
							.setDescription('Reply with a number within 30 seconds to continue.')
							.setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
							.addFields({ name: 'Prediction Title', value: pollDbEntry.title })
							.addFields({ name: 'Your Choice', value: pollDbEntry[pollChoice] });

						await interaction.user.send({ embeds: [bettingEmbed] });
						const DMChannel = await interaction.user.dmChannel.fetch();
				
						DMChannel.awaitMessages({ max: 1, time: 30_000, errors: ['time'] })
							.then(async collected => {
								for (const message of collected.values()){
									const pointsBet = parseInt(message.content, 10);
									// Check if poll is still open
									const pollClosedCheck = await Prediction.findOne({ messageId: pollDbEntry.messageId });
									if (pollClosedCheck.closed) {
										await DMChannel.send('This poll has been closed.');
										return;
									}

									// Check if valid integer
									if (Number.isInteger(pointsBet)) {
										if (pointsBet <= 0) {
											DMChannel.send('Number must be a positive integer.');
											return;
										}
										// Check if user has points to spend
										if (userPointsDBEntry.points === 0) {
											await DMChannel.send('You have no points to spend. Please wait until the next daily point assignment.');
											return;
										}
										// Check if amount of points bet < amount of points available
										if (userPointsDBEntry.points < pointsBet) {
											
											const unavailablePointsEmbed = new EmbedBuilder()
												.setColor(0x03a9f4)
												.setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
												.setDescription(`You only have **${userPointsDBEntry.points}** ${currencyName}s to spend. Would you like to spend all of them?\n\nReply Y/N within 30 seconds to continue.`)

											await DMChannel.send({ embeds: [unavailablePointsEmbed] });
											const ynFilter = m => !m.author.bot && (m.content.toLowerCase() === 'y' || m.content.toLowerCase() === 'n');
											DMChannel.awaitMessages({ ynFilter, max: 1, time: 30_000, errors: ['time'] })
												.then(async collected1 => {
													for (const message of collected1.values()) {
														// console.log(message);
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
												});
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

											// Fetch updated poll database entry
											const newPollDbEntry = await Prediction.findOne({ messageId: pollId });
											
											// Update original poll message
											const pollMessage = interaction.channel.messages.cache.get(newPollDbEntry.messageId);
											const previousEmbed = pollMessage.embeds[0];
											const endDate = new Date(Number(newPollDbEntry.endDate));
				
											const newEmbed = new EmbedBuilder()
												.setColor(0x03a9f4)
												.setTitle(newPollDbEntry.title)
												.setAuthor(previousEmbed.author)
												.addFields({ name: `${newPollDbEntry.choice1}`, value: `${newPollDbEntry.choice1_points} pts`, inline: true })
												.addFields({ name: `${newPollDbEntry.choice2}`, value: `${newPollDbEntry.choice2_points} pts`, inline: true })
												.setFooter({ text: `Closes on ${endDate.toLocaleString('en-US')}` });
											
											pollMessage.edit({ embeds: [newEmbed] });

											const confirmationEmbed = new EmbedBuilder()
												.setColor(0x03a9f4)
												.setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
												.setDescription(`You bet **${pointsBet}** points on **${newPollDbEntry[pollChoice]}**.\nYou now have **${currentPoints - pointsBet}** points remaining.`);

											DMChannel.send({embeds: [confirmationEmbed] });
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
	async closePoll(interaction, pollId){
		const res = await Prediction.updateOne({ 'messageId': pollId }, { $set: { 'closed': true } });
		console.log(`${res.modifiedCount} database(s) modified.`);

		const newPollDbEntry = await Prediction.findOne({ messageId: pollId });
		const endDate = new Date(Number(newPollDbEntry.endDate));

		const pollMessage = interaction.channel.messages.cache.get(pollId);
		const previousEmbed = pollMessage.embeds[0];

		const newEmbed = new EmbedBuilder()
			.setColor(0xf44336)
			.setTitle(previousEmbed.title)
			.setAuthor(previousEmbed.author)
			.setFields(previousEmbed.fields)
			.setFooter({ text: `Poll closed on ${endDate.toLocaleString('en-US')}`});

		await pollMessage.edit({ embeds: [newEmbed] });
		return;
	}
};