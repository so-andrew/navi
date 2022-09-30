const mongo = require('../mongo.js');
const cron = require('node-cron');
const axios = require('axios').default;
const { EmbedBuilder } = require('discord.js');
const { Summoner, Leaderboard } = require('../schemas/lp_leaderboard.js');
const { ServerSettings } = require('../schemas/serversettings.js');

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

module.exports = {
	name: 'ready',
	once: true,
	async execute(client) {

		mongo();
		await this.leaderboardInitializeCronJobs(client);
		console.log(`Logged in as ${client.user.tag}.`);

	},
	async leaderboardInitializeCronJobs(client) {
		// Get all guilds
		const guilds = client.guilds.cache.map(guild => guild);

		for (const guild of guilds) {
			// Schedule cron job
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

					// SummonerInfo class for printing
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
					// Communicate with database, Riot API to fetch current ranks
					const summonerLookup = async (summoners) => {
						const output = await Promise.all(summoners.map(async (element) => {
							const summoner = await Summoner.findById(element);
							const rankRes = await rankInstance.get(`${summoner.summonerId}`);
							// console.log(rankRes.data);
							let rankedSolo;
							if (rankRes.status === 200) {
								// console.log(rankRes.data);
								rankedSolo = await rankRes.data.filter(league => league.queueType === 'RANKED_SOLO_5x5');
								rankedSolo = rankedSolo[0];
							} else {
								console.log(`Error code ${rankRes.status}`);
								return;
							}
							if (!rankedSolo) {
								return new SummonerInfo(summoner.name, 'UNRANKED', 'UNRANKED', 0);
							}
							const summonerInfo = new SummonerInfo(summoner.name, rankedSolo.tier, rankedSolo.rank, rankedSolo.leaguePoints);
							return summonerInfo;
						}),
						);
						// console.log(output);
						return output;
					};

					const summonersToPrint = await summonerLookup(summonerList);

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
					for (const summoner of summonersToPrint) {
						output.push((count >= 1 && count <= 3) ? `${placement[count]} ${summoner.toString()}` : `${count}. ${summoner.toString()}`);
						count += 1;
					}

					// Create embed
					const LeaderboardEmbed = new EmbedBuilder()
						.setColor(0x03a9f4)
						.setTitle(`${guild.name} Leaderboard`)
						.setDescription(`${output.join('\n')}`)
						.setTimestamp();

					// Send message
					channel.send({ embeds: [LeaderboardEmbed] });
					console.log(`Posting leaderboard message for ${guild.name}.`);
				} else {
					console.log(`Skipping guild ${guild.name}.`);
				}
			});
			console.log(`Scheduled cron job for ${guild.name}.`);
		}
	},
};