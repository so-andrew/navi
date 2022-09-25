const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, SelectMenuBuilder } = require('discord.js');
const { RoleAssignment } = require('../schemas/roleassignments.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('roleremove')
		.setDescription('Displays a menu to remove access to specific channels.')
		.setDMPermission(false),
	async execute(interaction) {
		const dbEntries = await RoleAssignment.find({ guildId: interaction.guildId });
		const RolesEmbed = new EmbedBuilder()
			.setColor(0x03a9f4)
			.setTitle('Role Removal')
			.setDescription('Use the dropdown below to select which channels you no longer wish to see. Use the `/roleselect` command to regain access to a channel.\n\nChoose from the following channels:');
		const row = new ActionRowBuilder();
		const selectMenu = new SelectMenuBuilder()
			.setCustomId('removeRole')
			.setPlaceholder('Select a role')
			.setMinValues(1)
			.setMaxValues(dbEntries.length);

		if (!dbEntries) {
			await interaction.reply({ content: 'There are no channels registered in the system yet (run `/addchannelrole` to add a channel)', ephemeral: true });
			return;
		}

		const allRoles = await interaction.guild.roles.fetch();
		const allChannels = await interaction.guild.channels.fetch();

		dbEntries.forEach(entry => {
			const channel = allChannels.find(e => e.id === entry.channelId);
			selectMenu.addOptions(
				{
					label: `#${channel.name} - ${allRoles.find(e => e.id === entry.roleId).name}`,
					value: entry.channelId,
				},
			);
		});

		row.addComponents(selectMenu);
		await interaction.reply({ embeds: [RolesEmbed], components: [row], ephemeral: true });
	},
};