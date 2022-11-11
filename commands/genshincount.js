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
		if (interaction.member.roles.cache.some(role => role.id === '986382122539442226') || interaction.memberPermissions.has('ADMINISTRATOR')) {
			const genshinRole = await interaction.client.guild.roles.fetch('986382122539442226');
			const previousName = genshinRole.name;
			let previousCount = previousName.split(' ')[2];
			previousCount = previousCount.slice(0, length(previousCount)-1);

			const newName = `${updatedCount} (formerly ${previousCount})`;
			genshinRole.edit({ name: newName });

			await interaction.reply({ content: `Role name updated to ${newName}.` });
		}
		else {
			await interaction.reply({ content: 'You do not have permission to use this command.'});
		}
	}
}