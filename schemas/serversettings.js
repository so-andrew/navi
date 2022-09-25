const mongoose = require('mongoose');

const serverSettings = mongoose.Schema({
	guildId: String,
	rolesMessage: String,
	rolesChannel: String,
});

const serverSettingsSchema = mongoose.model('serversettings', serverSettings);

module.exports = { ServerSettings: serverSettingsSchema };