const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('genshincount')
		.setDescription('Updates the whale counter.')
		.setDMPermission(false)
		.addNumberOption(option =>
			option.setName('count')
				.setDescription('The updated count')
				.setRequired(true)),
	async execute(interaction) {
		const updatedCount = interaction.options.getNumber('count');
		const fetchedMember = await interaction.member.fetch();
		const fetchedRole = await fetchedMember.roles.resolve('986382122539442226');
		if (fetchedRole || interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
			const genshinRole = await interaction.guild.roles.fetch('986382122539442226', { force:true });
			const previousName = genshinRole.name;
			let previousCount = previousName.split(' ')[0];
			previousCount = previousCount.slice(0, previousCount.length);

			const newName = `$${updatedCount} (formerly ${previousCount})`;
			genshinRole.edit({ name: newName });

			await interaction.reply({ content: `Role name updated to ${newName}.` });
		}
		else {
			await interaction.reply({ content: 'You do not have permission to use this command.'});
		}
	}
};