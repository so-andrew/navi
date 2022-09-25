const { RoleAssignment } = require('../schemas/roleassignments.js');

module.exports = {
	name: 'interactionCreate',
	async execute(interaction) {
		console.log(`${interaction.user.tag} in #${interaction.channel.name} triggered an interaction.`);
		if (!interaction.isChatInputCommand() && !interaction.isSelectMenu()) return;

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
		}
	},
};