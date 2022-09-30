const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, SelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const { RoleAssignment } = require('../schemas/roleassignments.js');
const { ServerSettings } = require('../schemas/serversettings.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('roleselect')
		.setDescription('Displays a menu to gain access to specific channels.')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.setDMPermission(false),
	async execute(interaction) {
		const dbEntries = await RoleAssignment.find({ guildId: interaction.guildId });

		if (!dbEntries) {
			await interaction.reply({ content: 'There are no channels registered in the system yet (run `/addchannelrole` to add a channel)', ephemeral: true });
			return;
		}

		const RolesEmbed = new EmbedBuilder()
			.setColor(0x03a9f4)
			.setTitle('Role Assignment')
			.setDescription('Some of the channels in this server are locked behind specific roles in order to provide a cleaner server experience. You may choose to gain access to these channels using the dropdown below.')
			.setFooter({ text: `Up to date as of ${new Date(Date.now()).toLocaleString()}` });
		const row = new ActionRowBuilder();
		const selectMenu = new SelectMenuBuilder()
			.setCustomId('selectRole')
			.setPlaceholder('Select a channel')
			.setMinValues(1)
			.setMaxValues(dbEntries.length);

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
		const message = await interaction.channel.send({ embeds: [RolesEmbed], components: [row] });
		await this.updateServerSettings(interaction, message);
		await interaction.reply({ content: `Rules message sent in ${interaction.channel}.`, ephemeral: true });
	},
	async updateServerSettings(interaction, message) {
		const messageEntry = await ServerSettings.findOne({ guildId: message.guild.id }).exec();
		if (messageEntry) {
			const res = await ServerSettings.updateOne({ guildId: message.guild.id }, { $set: { rolesMessage: message.id, rolesChannel: message.channel.id } });
			console.log(`${res.modifiedCount} document(s) updated.`);
		} else {
			const newMessageEntry = {
				guildId: message.guild.id,
				rolesMessage: message.id,
				rolesChannel: message.channel.id,
			};
			const res = await ServerSettings.insertMany(newMessageEntry);
			console.log(res[0].guildId ? 'Successfully created database entry.' : 'Failed to connect to database.');
		}
	},
};