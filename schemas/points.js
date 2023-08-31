const mongoose = require('mongoose');

const points = mongoose.Schema({
	userId: String,
	userName: String,
	guildId: String,
	guildName: String,
	points: Number,
});

const pointsSchema = mongoose.model('points', points);

module.exports = { Points: pointsSchema };