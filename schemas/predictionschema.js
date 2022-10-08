const mongoose = require('mongoose');
require('mongoose-long')(mongoose);
const { Types: { Long } } = mongoose;

const prediction = mongoose.Schema({
	guildId: String,
	messageId: String,
	title: String,
	choice1: String,
	choice1_points: Number,
	choice2: String,
	choice2_points: Number,
	startDate: {
		type: Long,
	},
	endDate: {
		type: Long,
	},
	closed: Boolean,
	users: {
		type: Map,
		of: Object,
	},
});

const predictionSchema = mongoose.model('predictions', prediction);

module.exports = { Prediction: predictionSchema };

