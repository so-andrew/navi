const mongo = require('../mongo.js');
const cron = require('node-cron');
const axios = require('axios').default;
const { EmbedBuilder, italic } = require('discord.js');
const { Summoner, Leaderboard } = require('../schemas/lp_leaderboard.js');
const { ServerSettings } = require('../schemas/serversettings.js');
const { Points } = require('../schemas/points.js');
const { Globals } = require('../schemas/globals.js');
const logger = require('../logger');

const rankInstance = axios.create({
	baseURL: 'https://na1.api.riotgames.com/lol/league/v4/entries/by-summoner/',
	timeout: 1000,
	headers: { 'X-Riot-Token': `${process.env.RIOT_API_KEY}` },
});

const placement = {
	1: ':first_place:',
	2: ':second_place:',
	3: ':third_place:',
};

const tiers = {
	'UNRANKED': -1,
	'IRON': 0,
	'BRONZE': 1,
	'SILVER': 2,
	'GOLD': 3,
	'PLATINUM': 4,
	'DIAMOND': 5,
	'MASTER': 6,
	'GRANDMASTER': 7,
	'CHALLENGER': 8,
};

const divs = {
	'I': '3',
	'II': '2',
	'III': '1',
	'IV': '0',
	'UNRANKED': -1,
};

function delay(ms){
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}


module.exports = {
	name: 'ready',
	once: true,
	async execute(client) {

		mongo();
		await this.leaderboardInitializeCronJobs(client);
		logger.info(`Logged in as ${client.user.tag}.`);

	},
	async leaderboardInitializeCronJobs(client) {
		// Get all guilds
		const guilds = client.guilds.cache.map(guild => guild);
		const globals = await Globals.findById('636d6d10c0cc3c0c70a6bfe2');

		for (const guild of guilds) {

			const currentDate = Date.now();
			if (currentDate > new Date(2022, 11, 15, 3, 0, 0) && currentDate < new Date(2023, 1, 6, 19, 0, 0)) {
				if (globals.rankedSeasonActive) {
					await Globals.findByIdAndUpdate('636d6d10c0cc3c0c70a6bfe2', { $set: { rankedSeasonActive: false } });
				}
				logger.info('Ranked season has not started yet.');
			}
			else {
				// Schedule end-of-season tasks
				cron.schedule('59 2 15 11 *', async () => {
					// Returns the database entry if there is a set leaderboard channel
					const serverSettingsEntry = await ServerSettings.findOne({ guildId: guild.id, leaderboardChannel: { $exists: true } });

					if (serverSettingsEntry) {
						const channelId = serverSettingsEntry.leaderboardChannel;
						let channel = guild.channels.cache.get(channelId);
						if (!channel) {
							channel = await guild.channels.fetch(channelId);
						}

						// Get Leaderboard database entry
						const serverLeaderboard = await Leaderboard.findOne({ guildId: guild.id });
						const summonerList = serverLeaderboard.summonerList;

						// Get the entries from the 'summoners' database
						const summonerDatabaseEntryList = await Promise.all(summonerList.map((element) => {
							return Summoner.findById(element);
						}));

						// SummonerInfo helper class
						class SummonerInfo {
							constructor(name, tier, div, lp) {
								this.name = name;
								this.tier = tier;
								this.div = div;
								this.lp = lp;
							}
							toString() {
								if (this.tier === 'UNRANKED') {
									return `**${this.name}** (Unranked)`;
								}
								return `**${this.name}** (${this.tier.substr(0, 1) + this.tier.substr(1).toLowerCase()} ${this.div}, ${this.lp} LP)`;
							}
						}

						// Declare function for rate limiting api calls by introducing delay
						const rankAPICall = (query, ms) => {
							return new Promise((resolve, reject) => {
								delay(ms).then(async () => {
									await rankInstance.get(query)
										.then(res => {
											resolve(res.data.filter(league => league.queueType === 'RANKED_SOLO_5x5'));
										})
										.catch(error => {
											logger.error(error.message);
											resolve(null);
										});
								});
							});
						};

						// Perform calls to Riot API here
						const summonerRankLookup = async (summoners) => {
							const output = [];

							// Format requests to Riot API (including delay amount)
							const requests = summoners.map((element, i) => {
								const ms = i * 60;
								return rankAPICall(element.summonerId, ms);
							});

							// Await all requests
							const res = await Promise.all(requests);

							// Format output with SummonerInfo helper class
							summoners.forEach(async (summoner, i) => {
								if (!res[i]) {
									logger.error('Something went wrong on the backend.');
									return;
								}
								const rankedSolo = res[i][0];
								if (!rankedSolo) {
									output.push(new SummonerInfo(summoner.name, 'UNRANKED', 'UNRANKED', 0));
								} else {
									output.push(new SummonerInfo(summoner.name, rankedSolo.tier, rankedSolo.rank, rankedSolo.leaguePoints));
								}
							});
							return output;
						};

						// Get the array of SummonerInfo objects (calling above function)
						const summonersToPrint = await summonerRankLookup(summonerDatabaseEntryList);

						// Sort by rank
						summonersToPrint.sort((e1, e2) => {
							if (tiers[e1.tier] === tiers[e2.tier]) {
								if (divs[e1.div] === divs[e2.div]) {
									if (e1.lp === e2.lp) {
										return 0;
									} else if (e1.lp > e2.lp) {
										return -1;
									} else {
										return 1;
									}
								} else if (divs[e1.div] > divs[e2.div]) {
									return -1;
								} else {
									return 1;
								}
							} else if (tiers[e1.tier] > tiers[e2.tier]) {
								return -1;
							} else {
								return 1;
							}
						});

						await Leaderboard.updateOne({ guildId: guild.id }, 
							{ $set: { ['pastLeaderboards.Season 12']: summonersToPrint } }
						);
						logger.info('Added Season 12 ranks to database.');

					} else {
						logger.info(`Skipping guild ${guild.name}.`);
					}
				});

				// Schedule cron job for daily leaderboard
				cron.schedule('0 0 6 * * *', async () => {
				// Returns the database entry if there is a set leaderboard channel
					const serverSettingsEntry = await ServerSettings.findOne({ guildId: guild.id, leaderboardChannel: { $exists: true } });

					if (serverSettingsEntry) {
						const channelId = serverSettingsEntry.leaderboardChannel;
						let channel = guild.channels.cache.get(channelId);
						if (!channel) {
							channel = await guild.channels.fetch(channelId);
						}

						// Get Leaderboard database entry
						const serverLeaderboard = await Leaderboard.findOne({ guildId: guild.id });
						const summonerList = serverLeaderboard.summonerList;

						// Get the entries from the 'summoners' database
						const summonerDatabaseEntryList = await Promise.all(summonerList.map((element) => {
							return Summoner.findById(element);
						}));

						// SummonerInfo helper class
						class SummonerInfo {
							constructor(name, tier, div, lp) {
								this.name = name;
								this.tier = tier;
								this.div = div;
								this.lp = lp;
							}
							toString() {
								if (this.tier === 'UNRANKED') {
									return `**${this.name}** (Unranked)`;
								}
								return `**${this.name}** (${this.tier.substr(0, 1) + this.tier.substr(1).toLowerCase()} ${this.div}, ${this.lp} LP)`;
							}
						}

						// Declare function for rate limiting api calls by introducing delay
						const rankAPICall = (query, ms) => {
							return new Promise((resolve, reject) => {
								delay(ms).then(async () => {
									await rankInstance.get(query)
										.then(res => {
											resolve(res.data.filter(league => league.queueType === 'RANKED_SOLO_5x5'));
										})
										.catch(error => {
											logger.error(error.message);
											resolve(null);
										});
								});
							});
						};

						// Perform calls to Riot API here
						const summonerRankLookup = async (summoners) => {
							const output = [];

							// Format requests to Riot API (including delay amount)
							const requests = summoners.map((element, i) => {
								const ms = i * 60;
								return rankAPICall(element.summonerId, ms);
							});

							// Await all requests
							const res = await Promise.all(requests);

							// Format output with SummonerInfo helper class
							summoners.forEach(async (summoner, i) => {
								if (!res[i]) {
									logger.error('Something went wrong on the backend.');
									return;
								}
								const rankedSolo = res[i][0];
								if (!rankedSolo) {
									output.push(new SummonerInfo(summoner.name, 'UNRANKED', 'UNRANKED', 0));
								} else {
									output.push(new SummonerInfo(summoner.name, rankedSolo.tier, rankedSolo.rank, rankedSolo.leaguePoints));
								}
							});
							return output;
						};

						// Get the array of SummonerInfo objects (calling above function)
						const summonersToPrint = await summonerRankLookup(summonerDatabaseEntryList);

						// Sort by rank
						summonersToPrint.sort((e1, e2) => {
							if (tiers[e1.tier] === tiers[e2.tier]) {
								if (divs[e1.div] === divs[e2.div]) {
									if (e1.lp === e2.lp) {
										return 0;
									} else if (e1.lp > e2.lp) {
										return -1;
									} else {
										return 1;
									}
								} else if (divs[e1.div] > divs[e2.div]) {
									return -1;
								} else {
									return 1;
								}
							} else if (tiers[e1.tier] > tiers[e2.tier]) {
								return -1;
							} else {
								return 1;
							}
						});

						// Generate output array for printing
						const output = [];
						let count = 1;
						let overflowCount = 0;
						for (const summoner of summonersToPrint) {
							if (count <= 10) {
								output.push((count >= 1 && count <= 3) ? `${placement[count]} ${summoner.toString()}` : `${count}. ${summoner.toString()}`);
							} else {
								overflowCount += 1;
							}
							count += 1;
						}
						let outputString = output.join('\n');
						if (overflowCount > 0) {
							outputString += `\n${italic(`plus ${overflowCount} more...`)}`;
						}

						// Create embed
						const LeaderboardEmbed = new EmbedBuilder()
							.setColor(0x03a9f4)
							.setTitle(`${guild.name} Leaderboard`)
							.setDescription(outputString)
							.setTimestamp();

						// Send message
						channel.send({ embeds: [LeaderboardEmbed] });
						logger.info(`Posting leaderboard message for ${guild.name}.`);
					} else {
						logger.info(`Skipping guild ${guild.name}.`);
					}
				});
				logger.info(`Scheduled leaderboard cron job for ${guild.name}.`);
			}
			

			cron.schedule('0 0 6 * * *', async () => {
				// Get users
				const users = await Points.find({ guildId: guild.id });
				
				if (users) {
					const updatePoints = async (users) => {
						const requests = users.map(async (user) => {
							return Points.updateOne({ guildId: guild.id, userId: user.userId }, { $inc: { points: 150 }});
						});
						await Promise.all(requests);
					};
					await updatePoints(users);
					logger.info(`Distributing daily points for ${guild.name}.`);
				} else {
					logger.info(`Skipping point distribution for ${guild.name}`);
				}
			});
			logger.info(`Scheduled point assignment cron job for ${guild.name}.`);
		}
	},
};