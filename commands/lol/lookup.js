const { Command } = require('discord.js-commando')
const { MessageEmbed } = require('discord.js')
const { Kayn, REGIONS } = require('kayn')
require('dotenv').config();

module.exports = class LookupCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'lookup',
            aliases: ['lol'],
            description: "Fetches the current League of Legends rank of the specified player.",
            group: 'league',
            memberName: 'lookup',
            examples: ["`!lookup Sarinda`"],
            format: "`!lookup <summoner name>` (required)",
            args: [
                {
                    key: 'name',
                    prompt: 'Who would you like to look up?',
                    type: 'string',
                }
            ]
        })
    }

    async run(message, { name }) {
        const kayn = Kayn(process.env.RIOT_API_KEY)();
        const summoner = await kayn.Summoner.by.name(name);
        console.log(summoner);
        const league_info = await kayn.League.Entries.by.summonerID(summoner.id);
        console.log(league_info);
        let rankedSolo = league_info.filter(league => league.queueType === 'RANKED_SOLO_5x5')[0];
        console.log(rankedSolo);
        message.say(`${summoner.name} is currently ${rankedSolo.tier} ${rankedSolo.rank} ${rankedSolo.leaguePoints} LP.`);
    }
}