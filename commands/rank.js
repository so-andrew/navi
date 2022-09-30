const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios').default;
const Vibrant = require('node-vibrant');
require('dotenv').config();

const rankCrests = {
	'IRON': 'https://i.imgur.com/X8aefwP.png',
	'BRONZE': 'https://i.imgur.com/4nqd5aa.png',
	'SILVER': 'https://i.imgur.com/f8Rpbci.png',
	'GOLD': 'https://i.imgur.com/lGOBeab.png',
	'PLATINUM': 'https://i.imgur.com/QUUnlE5.png',
	'DIAMOND': 'https://i.imgur.com/X01bkbo.png',
	'MASTER': 'https://i.imgur.com/vXdsUJl.png',
	'GRANDMASTER': 'https://i.imgur.com/w3KvGRX.png',
	'CHALLENGER': 'https://i.imgur.com/vG1wRj3.png',
};

const summonerInstance = axios.create({
	baseURL: 'https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-name/',
	timeout: 1000,
	headers: { 'X-Riot-Token': `${process.env.RIOT_API_KEY}` },
});

const RankInstance = axios.create({
	baseURL: 'https://na1.api.riotgames.com/lol/league/v4/entries/by-summoner/',
	timeout: 1000,
	headers: { 'X-Riot-Token': `${process.env.RIOT_API_KEY}` },
});

module.exports = {
	data: new SlashCommandBuilder()
		.setName('rank')
		.setDescription('Fetches the current solo queue rank of the provided summoner.')
		.setDMPermission(false)
		.addStringOption(option =>
			option.setName('summoner')
				.setDescription('The summoner name')
				.setRequired(true),
		)
		.addBooleanOption(option =>
			option.setName('expanded')
				.setDescription('Use the expanded layout (larger images)'),
		),
	async execute(interaction) {
		await interaction.deferReply();

		const versionsRes = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json');
		const currentVersion = versionsRes.data[0];

		const expandedLayout = interaction.options.getBoolean('expanded');
		const summonerNameLookup = interaction.options.getString('summoner');
		if (summonerNameLookup.length < 3 || summonerNameLookup.length > 16) {
			await interaction.editReply('Summoner names must be at least 3 characters long and no more than 16 characters long.');
			return;
		}

		let summonerRes;
		try {
			summonerRes = await summonerInstance.get(`${summonerNameLookup}`);
		} catch (error) {
			console.log(error);
			await interaction.editReply('Something went wrong.');
			return;
		}

		const summonerId = summonerRes.data.id;
		const rankRes = await RankInstance.get(`${summonerId}`);
		let rankedSolo;

		if (rankRes.status === 200) {
			rankedSolo = await rankRes.data.filter(league => league.queueType === 'RANKED_SOLO_5x5');
			rankedSolo = rankedSolo[0];
		} else {
			console.log(`Error code ${rankRes.status}`);
			await interaction.editReply('Something went wrong.');
			return;
		}

		if (rankedSolo) {
			const v = new Vibrant(`https://ddragon.leagueoflegends.com/cdn/${currentVersion}/img/profileicon/${summonerRes.data.profileIconId}.png`);
			const palette = await v.getPalette();
			/*
			const baseCrest = `./resources/rankedcrests/${rankCrestFolders[rankedSolo.tier]}/${rankedSolo.tier.toLowerCase()}_baseface_matte.png`;
			let crown = `./resources/rankedcrests/${rankCrestFolders[rankedSolo.tier]}/${rankedSolo.tier.toLowerCase()}_crown`;

			if (rankedSolo.tier === 'MASTER' || rankedSolo.tier === 'GRANDMASTER' || rankedSolo.tier === 'CHALLENGER') {
				crown += '.png';
			} else {
				crown += `_${rankDict[rankedSolo.rank]}.png`;
			}

			let data, file;

			try {
				const fileExists = await fs.readFile(`./resources/rankedcrests/${rankCrestFolders[rankedSolo.tier]}/${rankedSolo.tier.toLowerCase()}_crest_${rankDict[rankedSolo.rank]}.png`);
				if (fileExists) {
					file = new AttachmentBuilder(`./resources/rankedcrests/${rankCrestFolders[rankedSolo.tier]}/${rankedSolo.tier.toLowerCase()}_crest_${rankDict[rankedSolo.rank]}.png`);
				}
			} catch (err) {
				console.log(err);
			}

			if (!file) {
				console.log('Could not find appropriate ranked crest + crown combo, creating new file.');
				const b64 = await mergeImages([baseCrest, crown], {
					Canvas: Canvas,
					Image: Image,
				});

				try {
					data = b64.replace(/^data:image\/\w+;base64,/, '');
					await fs.writeFile(`./resources/rankedcrests/${rankCrestFolders[rankedSolo.tier]}/${rankedSolo.tier.toLowerCase()}_crest_${rankDict[rankedSolo.rank]}.png`, data, { encoding: 'base64' });
					file = new AttachmentBuilder(`./resources/rankedcrests/${rankCrestFolders[rankedSolo.tier]}/${rankedSolo.tier.toLowerCase()}_crest_${rankDict[rankedSolo.rank]}.png`, data, { encoding: 'base64' });
				} catch (err) {
					console.error(err);
					await interaction.editReply('Something went wrong.');
					return;
				}
			}
			*/

			// console.log(palette['Vibrant'].rgb);
			// console.log(palette['Vibrant'].hex);

			const RankEmbed = new EmbedBuilder()
				.setAuthor({ name: summonerNameLookup, iconURL: `https://ddragon.leagueoflegends.com/cdn/${currentVersion}/img/profileicon/${summonerRes.data.profileIconId}.png` })
				.setDescription(`${summonerNameLookup} is currently **${rankedSolo.tier.substr(0, 1) + rankedSolo.tier.substr(1).toLowerCase()} ${rankedSolo.rank}, ${rankedSolo.leaguePoints} LP**.`)
				.setColor(palette['Vibrant'].hex)
				.setTimestamp()
				.addFields(
					{ name: 'Win Rate', value: `${Math.floor(rankedSolo.wins / (rankedSolo.wins + rankedSolo.losses) * 100)}% (${rankedSolo.wins}/${rankedSolo.wins + rankedSolo.losses})` },
				)
				.setFooter({ text: 'Psyche', iconURL: 'https://i.imgur.com/tPPablz.jpg' });

			if (expandedLayout) {
				RankEmbed
					.setImage(rankCrests[rankedSolo.tier])
					.setThumbnail(`https://ddragon.leagueoflegends.com/cdn/${currentVersion}/img/profileicon/${summonerRes.data.profileIconId}.png`);
			} else {
				RankEmbed.setThumbnail(rankCrests[rankedSolo.tier]);
			}

			await interaction.editReply({ embeds: [RankEmbed] });
		} else {
			const v = new Vibrant(`https://ddragon.leagueoflegends.com/cdn/${currentVersion}/img/profileicon/${summonerRes.data.profileIconId}.png`);
			const palette = await v.getPalette();

			const RankEmbed = new EmbedBuilder()
				.setAuthor({ name: summonerNameLookup, iconURL: `https://ddragon.leagueoflegends.com/cdn/${currentVersion}/img/profileicon/${summonerRes.data.profileIconId}.png` })
				.setDescription(`${summonerNameLookup} is currently **unranked** in solo queue.`)
				.setColor(palette['Vibrant'].hex)
				.setTimestamp()
				.setFooter({ text: 'Psyche', iconURL: 'https://i.imgur.com/tPPablz.jpg' });

			if (expandedLayout) {
				RankEmbed.setImage(`https://ddragon.leagueoflegends.com/cdn/${currentVersion}/img/profileicon/${summonerRes.data.profileIconId}.png`);
			} else {
				RankEmbed.setThumbnail(`https://ddragon.leagueoflegends.com/cdn/${currentVersion}/img/profileicon/${summonerRes.data.profileIconId}.png`);
			}

			await interaction.editReply({ embeds: [RankEmbed] });
		}
	},
};