const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, SelectMenuBuilder, EmbedBuilder } = require('discord.js');
const { RoleAssignment } = require('../schemas/roleassignments.js');
const { ServerSettings } = require('../schemas/serversettings.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('deletechannelrole')
		.setDescription('Removes a channel from the role assignment system.')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addChannelOption(option => option.setName('channel')
			.setDescription('The channel you want to remove (leave empty for current channel)')
			.setRequired(false)),
	async execute(interaction) {
		const channelToRemove = interaction.options.getChannel('channel');
		await this.removeRoleAssignment(interaction, channelToRemove);
	},
	async removeRoleAssignment(interaction, channelToRemove) {
		const channelEntry = await RoleAssignment.findOne({ channelId: channelToRemove.id }).exec();
		if (channelEntry) {
			// Delete entry
			const res = await RoleAssignment.deleteOne({ channelId: channelToRemove.id }).exec();
			console.log(`${res.deletedCount} document(s) removed.`);
			await interaction.reply({ content: `Removing channel ${channelToRemove} from the role assignment system.`, ephemeral: true });
		} else {
			console.log('No channel to remove.');
			await interaction.reply('This channel is not in the system.');
			return;
		}

		const roleMessageEntry = await ServerSettings.findOne({ guildId: interaction.guild.id }).exec();
		if (roleMessageEntry) {
			const roleChannel = await interaction.guild.channels.fetch(roleMessageEntry.rolesChannel);
			const roleMessage = await roleChannel.messages.fetch(roleMessageEntry.rolesMessage);

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