const mongoose = require('mongoose');

const globals = mongoose.Schema({
	botUserId: String,
	rankedSeasonActive: Boolean
});

const globalSchema = mongoose.model('globals', globals);

module.exports = { Globals: globalSchema };