const { ContextMenuCommandBuilder, ApplicationCommandType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { Prediction } = require('../schemas/predictionschema.js');
const logger = require('../logger');

module.exports = {
	data: new ContextMenuCommandBuilder()
		.setName('Close Prediction')
		.setType(ApplicationCommandType.Message)
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(interaction) {
		await interaction.deferReply();
		//console.log(interaction);
		const pollDbEntry = await Prediction.findOne({ messageId: interaction.targetMessage.id });
		// Message is not a poll
		if (!pollDbEntry) {
			await interaction.editReply('This message does not contain a prediction.');
			return;
		}
		// Poll is already closed
		if(pollDbEntry.closed) {
			await interaction.editReply('This prediction has already been closed.');
			return;
		} 
		// Close poll
		await this.closePoll(interaction, interaction.targetMessage.id);
		await interaction.editReply('Prediction closed.');
		return;
	},
	async closePoll(interaction, pollId){
		const res = await Prediction.updateOne({ 'messageId': pollId }, { $set: { 'closed': true } });
		logger.info(res.modifiedCount ? `Poll ${pollId} is now closed.` : 'Something went wrong when trying to close the poll.');

		const pollMessage = interaction.channel.messages.cache.get(pollId);
		const previousEmbed = pollMessage.embeds[0];
		const currentTime = new Date(Date.now());

		const newEmbed = new EmbedBuilder()
			.setColor(0xf44336)
			.setTitle(previousEmbed.title)
			.setAuthor(previousEmbed.author)
			.setFields(previousEmbed.fields)
			.setFooter({ text: `Poll closed on ${currentTime.toLocaleString('en-US')}`});

		await pollMessage.edit({ embeds: [newEmbed] });
		return;
	}
};