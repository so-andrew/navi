const mongoose = require('mongoose');

const serverSettings = mongoose.Schema({
	guildId: String,
	rolesMessage: String,
	rolesChannel: String,
	leaderboardChannel: String,
	currencyName: String,
});

const serverSettingsSchema = mongoose.model('serversettings', serverSettings);

module.exports = { ServerSettings: serverSettingsSchema };