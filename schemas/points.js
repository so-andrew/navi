const mongoose = require('mongoose');

const points = mongoose.Schema({
	userId: String,
	guildId: String,
	points: Number,
});

const pointsSchema = mongoose.model('points', points);

module.exports = { Points: pointsSchema };