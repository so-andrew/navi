/* eslint-disable no-undef */
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, italic } = require('discord.js');
const { Summoner, Leaderboard } = require('../schemas/lp_leaderboard.js');
const { ServerSettings } = require('../schemas/serversettings.js');
const { Globals } = require('../schemas/globals.js');
const axios = require('axios').default;
require('dotenv').config();

const summonerInstance = axios.create({
	baseURL: 'https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-name/',
	timeout: 1000,
	headers: { 'X-Riot-Token': `${process.env.RIOT_API_KEY}` },
});

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
	data: new SlashCommandBuilder()
		.setName('leaderboard')
		.setDescription('Displays a solo queue leaderboard for League.')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.setDMPermission(false)
		.addSubcommand(subcommand => subcommand
			.setName('print')
			.setDescription('Print the leaderboard')
			.addBooleanOption(option => option.setName('expanded').setDescription('Prints the entire leaderboard.')))
		.addSubcommand(subcommand => subcommand
			.setName('add')
			.setDescription('Add a summoner to the leaderboard')
			.addStringOption(option => option.setName('summoneradd').setDescription('Summoner to add').setRequired(true)))
		.addSubcommand(subcommand => subcommand
			.setName('remove')
			.setDescription('Remove a summoner from the leaderboard')
			.addStringOption(option => option.setName('summonerremove').setDescription('Summoner to remove').setRequired(true)))
		.addSubcommand(subcommand => subcommand
			.setName('channel')
			.setDescription('Sets the channel that the leaderboard will be posted in.')
			.addChannelOption(option => option.setName('leaderboardchannel').setDescription('Channel to use').setRequired(true)))
		.addSubcommand(subcommand => subcommand
			.setName('disable')
			.setDescription('Disables the leaderboard auto-message feature.')),
	async execute(interaction) {
		await interaction.deferReply();
		const serverLeaderboard = await Leaderboard.findOne({ guildId: interaction.guildId });
		const expandedLayout = interaction.options.getBoolean('expanded');
		const globals = await Globals.findById('636d6d10c0cc3c0c70a6bfe2');

		if (interaction.options.getSubcommand() === 'add') {
			// Get summoner information from Riot API
			const summonerNameLookup = interaction.options.getString('summoneradd');
			const summonerDocument = await this.fetchSummoner(summonerNameLookup);
			if (!summonerDocument) {
				await interaction.editReply('This summoner does not exist.');
				return;
			}

			// If no guild entries exist in leaderboard, create one
			if (!serverLeaderboard) {
				const newLeaderboard = {
					guildId: `${interaction.guildId}`,
					name: interaction.guild.name,
				};
				const res = await Leaderboard.insertMany(newLeaderboard);
				await Leaderboard.updateOne({ 'guildId': interaction.guildId }, { $push: { 'summonerList': summonerDocument._id } });
				console.log(res[0].guildId ? 'Successfully created database entry.' : 'Failed to connect to database.');
				await interaction.editReply(`Added ${summonerDocument.name} to the leaderboard.`);
				return;
			} else {
				const leaderboardContainsSummoner = await Leaderboard.find({ 'guildId': interaction.guildId, 'summonerList': summonerDocument._id });
				if (leaderboardContainsSummoner.length === 0) {
					const res = await Leaderboard.updateOne({ 'guildId': interaction.guildId }, { $push: { 'summonerList': summonerDocument._id } });
					console.log(`${res.modifiedCount} database(s) modified.`);
					await interaction.editReply(`Added ${summonerDocument.name} to the leaderboard.`);
					return;
				} else {
					await interaction.editReply('This summoner is already on the leaderboard.');
					return;
				}
			}

		} else if (interaction.options.getSubcommand() === 'remove') {
			// Get summoner information from Riot API
			const summonerNameLookup = interaction.options.getString('summonerremove');
			const summonerDocument = await this.fetchSummoner(summonerNameLookup);
			if (!summonerDocument) {
				await interaction.editReply('This summoner does not exist.');
				return;
			}

			if (!serverLeaderboard) {
				await interaction.editReply('No leaderboard database entry exists, try adding a summoner with `/lpleaderboard add`.');
				return;
			} else {
				const summonerList = serverLeaderboard.summonerList;
				if (summonerList.some(summoner => summoner.str === summonerDocument._id.str)) {
					const res = await Leaderboard.updateOne({ 'guildId': interaction.guildId }, { $pull: { 'summonerList': summonerDocument._id } });
					console.log(`${res.modifiedCount} database(s) modified.`);
					await interaction.editReply(`Removed ${summonerDocument.name} from the leaderboard.`);
					return;
				} else {
					await interaction.editReply('This summoner is not on the leaderboard.');
					return;
				}
			}
		} else if (interaction.options.getSubcommand() === 'print') {
			if(!globals.rankedSeasonActive) {

				const pastLeaderboards = serverLeaderboard.pastLeaderboards;
				const mostRecentLeaderboard = Array.from(pastLeaderboards.entries()).pop();
				const summonersToPrint = mostRecentLeaderboard[1];

				//const summonersToPrint = serverLeaderboard.pastLeaderboards.get('test');
				// Output string formatting
				const output = [];
				let count = 1;
				let overflowCount = 0;

				if (expandedLayout) {
					for (const summoner of summonersToPrint) {
						let summonerString = '';
						if (summoner.tier === 'UNRANKED') {
							summonerString = `**${summoner.name}** (Unranked)`;
						}
						else summonerString = `**${summoner.name}** (${summoner.tier.substr(0, 1) + summoner.tier.substr(1).toLowerCase()} ${summoner.div}, ${summoner.lp} LP)`;

						output.push((count >= 1 && count <= 3) ? `${placement[count]} ${summonerString}` : `${count}. ${summonerString}`);
						count += 1;
					}
				} else {
					for (const summoner of summonersToPrint) {
						let summonerString = '';
						if (summoner.tier === 'UNRANKED') {
							summonerString = `**${summoner.name}** (Unranked)`;
						}
						else summonerString = `**${summoner.name}** (${summoner.tier.substr(0, 1) + summoner.tier.substr(1).toLowerCase()} ${summoner.div}, ${summoner.lp} LP)`;

						if (count <= 10) {
							output.push((count >= 1 && count <= 3) ? `${placement[count]} ${summonerString}` : `${count}. ${summonerString}`);
						} else {
							overflowCount += 1;
						}
						count += 1;
					}
				}

				let outputString = output.join('\n');
				if (!expandedLayout && overflowCount > 0) {
					outputString += `\n${italic(`plus ${overflowCount} more...`)}`;
				}

				const LeaderboardEmbed = new EmbedBuilder()
					.setColor(0x03a9f4)
					.setTitle(`${interaction.guild.name} ${mostRecentLeaderboard[0]} Leaderboard`)
					.setDescription(outputString)
					.setTimestamp();

				await interaction.editReply({ embeds: [LeaderboardEmbed] });
				return;
			}
			else {
				// Get list of players on leaderboard for server
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
									console.log(error.message);
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
							await interaction.editReply('Something went wrong.');
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

				// Sort array with custom sort function
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

				// Output string formatting
				const output = [];
				let count = 1;
				let overflowCount = 0;
				if (expandedLayout) {
					for (const summoner of summonersToPrint) {
						output.push((count >= 1 && count <= 3) ? `${placement[count]} ${summoner.toString()}` : `${count}. ${summoner.toString()}`);
						count += 1;
					}
				} else {
					for (const summoner of summonersToPrint) {
						if (count <= 10) {
							output.push((count >= 1 && count <= 3) ? `${placement[count]} ${summoner.toString()}` : `${count}. ${summoner.toString()}`);
						} else {
							overflowCount += 1;
						}
						count += 1;
					}
				}

				let outputString = output.join('\n');
				if (!expandedLayout && overflowCount > 0) {
					outputString += `\n${italic(`plus ${overflowCount} more...`)}`;
				}

				const LeaderboardEmbed = new EmbedBuilder()
					.setColor(0x03a9f4)
					.setTitle(`${interaction.guild.name} Leaderboard`)
					.setDescription(outputString)
					.setTimestamp();

				await interaction.editReply({ embeds: [LeaderboardEmbed] });
				return;
			}
		} else if (interaction.options.getSubcommand() === 'channel') {
			// Set channel that daily leaderboard message will appear in
			const channelToAdd = interaction.options.getChannel('leaderboardchannel');
			await this.updateServerSettings(interaction, channelToAdd);
			await interaction.editReply('Leaderboard channel set.');
		} else if (interaction.options.getSubcommand() === 'disable') {
			// Disable daily leaderboard message by removing field in database
			await this.removeLeaderboardEntry(interaction);
			await interaction.editReply('Leaderboard feature disabled.');
		}
	},
	async fetchSummoner(summonerName) {
		// Fetch summoner information from Riot API
		let summonerRes;
		try {
			summonerRes = await summonerInstance.get(encodeURI(summonerName));
		} catch (error) {
			if (error.response) {
				console.log(error.response.data);
				console.log(error.response.status);
				console.log(error.response.headers);
			}
			return null;
		}
		if (summonerRes.status !== 200) {
			console.log(`Error code ${summonerRes.status}`);
			return null;
		}
		const summoner = summonerRes.data;
		let summonerDocument = await Summoner.findOne({ summonerId: summoner.id });
		if (!summonerDocument) {
			summonerDocument = new Summoner({
				summonerId: summoner.id,
				accountId: summoner.accountId,
				puuid: summoner.puuid,
				name: summoner.name,
				revisionDate: summoner.revisionDate,
			});
			summonerDocument.save();
		}
		return summonerDocument;
	},
	async updateServerSettings(interaction, channel) {
		const serverSettingsEntry = await ServerSettings.findOne({ guildId: interaction.guildId });
		if (serverSettingsEntry) {
			const res = await ServerSettings.updateOne({ guildId: interaction.guildId }, { $set: { leaderboardChannel: channel.id } });
			console.log(`${res.modifiedCount} document(s) updated.`);
		} else {
			const newServerSettingsEntry = {
				guildId: interaction.guildId,
				leaderboardChannel: channel.id,
			};
			const res = await ServerSettings.insertMany(newServerSettingsEntry);
			console.log(res[0].guildId ? 'Successfully created database entry.' : 'Failed to connect to database.');
		}
	},
	async removeLeaderboardEntry(interaction) {
		const serverSettingsEntry = await ServerSettings.findOne({ guildId: interaction.guildId });
		if (serverSettingsEntry) {
			const res = await ServerSettings.updateOne({ guildId: interaction.guildId }, { $unset: { leaderboardChannel: '' } });
			console.log(`${res.modifiedCount} document(s) updated.`);
		} else {
			console.log('No such entry.');
		}
	},
};