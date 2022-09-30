const mongoose = require('mongoose');
require('mongoose-long')(mongoose);
const { Types: { Long } } = mongoose;

const summoner = mongoose.Schema({
	summonerId: String,
	accountId: String,
	puuid: String,
	name: String,
	revisionDate: {
		type: Long,
	},
});

const leaderboard = mongoose.Schema({
	guildId: String,
	name: String,
	summonerList: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'summoners',
	}],
});

const summonerSchema = mongoose.model('summoners', summoner);
const leaderboardSchema = mongoose.model('leaderboards', leaderboard);

module.exports = { Summoner: summonerSchema, Leaderboard: leaderboardSchema };