const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('user')
		.setDescription('Replies with user info.')
		.addUserOption(option =>
			option.setName('user')
				.setDescription('The user to look up')
				.setRequired(false)),
	async execute(interaction) {
		const userSelected = interaction.options.getUser('user');
		let user;
		if (userSelected) {
			user = userSelected;
		} else {
			user = interaction.user;
		}

		const fetchedUser = await user.fetch();
		user = fetchedUser;
		const accentColor = user.hexAccentColor;
		let member;
		let highestRole;

		if (interaction.inGuild()) {
			member = await interaction.guild.members.fetch(user.id);
			highestRole = member.roles.highest;
		}

		const UserInfoEmbed = new EmbedBuilder()
			.setTitle('User Info')
			.setDescription(`${user} - ${user.tag}`)
			.setColor(`${accentColor}`)
			.setImage(`${user.displayAvatarURL()}`);
		UserInfoEmbed.addFields({ name: 'User Since', value: `${user.createdAt.toLocaleDateString()}`, inline: true });
		if (member) {
			UserInfoEmbed.addFields({ name: 'Date Joined', value: `${member.joinedAt.toLocaleDateString()}`, inline: true });
			UserInfoEmbed.addFields({ name: 'Highest Role', value: `${highestRole}` });
		}
		await interaction.reply({ embeds: [UserInfoEmbed] });
	},
};

