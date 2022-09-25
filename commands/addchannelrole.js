const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, SelectMenuBuilder, EmbedBuilder } = require('discord.js');
const { RoleAssignment } = require('../schemas/roleassignments.js');
const { ServerSettings } = require('../schemas/serversettings.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('addchannelrole')
		.setDescription('Used with the role assignment feature to allow people to react to a message to gain a specific role.')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addRoleOption(option => option.setName('role')
			.setDescription('The role you want to assign to the channel')
			.setRequired(true))
		.addChannelOption(option => option.setName('channel')
			.setDescription('The channel you want to use (leave empty to use current channel)')
			.setRequired(false)),
	async execute(interaction) {
		const potentialChannel = interaction.options.getChannel('channel');
		const roleToAdd = interaction.options.getRole('role');
		const botMember = await interaction.guild.members.fetch(interaction.client.user);

		if (roleToAdd.comparePositionTo(botMember.roles.highest) >= 0) {
			// Role is higher than bot's highest role, bot cannot assign it
			await interaction.reply({ content: `Role ${roleToAdd} is higher than or equal to the bot's highest role, cannot add.`, ephemeral: true });
			return;
		}

		let channelToAdd;
		if (!potentialChannel) {
			channelToAdd = interaction.channel;
		} else {
			channelToAdd = potentialChannel;
		}

		await this.createRoleAssignment(interaction, channelToAdd, roleToAdd);
		await interaction.reply({ content: `Role ${roleToAdd} has been assigned to channel ${channelToAdd}.`, ephemeral: true });
	},
	async createRoleAssignment(interaction, channelToAdd, roleToAdd) {
		const channelEntry = await RoleAssignment.findOne({ channelId: channelToAdd.id }).exec();
		if (channelEntry) {
			// Change existing emote to new emote
			const res = await RoleAssignment.updateOne({ channelId: channelToAdd.id }, { $set: { roleId: roleToAdd.id } }).exec();
			console.log(`${res.modifiedCount} document(s) updated.`);
		} else {
			// Create database entry
			const newRoleEntry = {
				roleId: roleToAdd.id,
				channelId: channelToAdd.id,
				guildId: interaction.guildId,
			};
			const res = await RoleAssignment.insertMany(newRoleEntry);
			console.log(res[0].roleId ? 'Successfully created assignment.' : 'Failed to connect to database.');
		}

		const roleMessageEntry = await ServerSettings.findOne({ guildId: interaction.guild.id }).exec();
		if (roleMessageEntry) {
			const roleChannel = await interaction.guild.channels.fetch(roleMessageEntry.rolesChannel);
			const roleMessage = await roleChannel.messages.fetch(roleMessageEntry.rolesMessage);

			// Cases
			// Case one: adding a completely new channel-role pair into the menu
			// Case two: channel already has a role, update menu
			// Case three: role already has a channel (irrelevant, roles can be tied to more than one channel)

			const allRolesInDb = await RoleAssignment.find({ guildId: interaction.guild.id }).exec();
			const allRoles = await interaction.guild.roles.fetch();
			const allChannels = await interaction.guild.channels.fetch();

			const row = new ActionRowBuilder();
			const selectMenu = new SelectMenuBuilder()
				.setCustomId('selectRole')
				.setPlaceholder('Select a channel')
				.setMinValues(1);

			let count = 0;
			allRolesInDb.forEach(entry => {
				const channel = allChannels.find(e => e.id === entry.channelId);
				selectMenu.addOptions(
					{
						label: `#${channel.name} - ${allRoles.find(e => e.id === entry.roleId).name}`,
						value: entry.channelId,
					},
				);
				count += 1;
			});

			selectMenu.setMaxValues(count);
			row.addComponents(selectMenu);

			const oldEmbed = roleMessage.embeds[0];
			const newEmbed = EmbedBuilder.from(oldEmbed)
				.setFooter({ text: `Up to date as of ${new Date(Date.now()).toLocaleString()}` });
			await roleMessage.edit({ embeds: [newEmbed], components: [row] });
		}
	},
};