const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder } = require('discord.js');
const { RoleAssignment } = require('../schemas/roleassignments.js');
const { Points } = require('../schemas/points.js');
const { Prediction } = require('../schemas/predictionschema.js');
const leaderboard = require('../commands/leaderboard.js');
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
					.setTimestamp();

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

				/* const pointsModal = new ModalBuilder()
					.setCustomId('pollPointsModal')
					.setTitle('Prediction Submit');

				const pointsInput = new TextInputBuilder()
					.setCustomId('pointsInput')
					.setLabel('How many points?')
					.setRequired(true);

				pointsModal.addComponents(pointsInput);
				await interaction.showModal(pointsModal);

				const filter = i => i.customId === 'pollPointsModal';
				interaction.awaitModalSubmit({ filter, time: 30000 })
					.then(i => {
						console.log(`${i.customId}`);
						interaction.editReply('Hi');
					})
					.catch(console.error);
				*/

				const filter = response => response.user.id === interaction.user.id;
				await interaction.editReply({ content: 'How many points do you want to bet?' });
			}
		}
	},
};