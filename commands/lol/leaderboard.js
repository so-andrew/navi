const { Command } = require('discord.js-commando')
const { MessageEmbed } = require('discord.js')
const { Kayn, REGIONS } = require('kayn')
const mongo = require('../../mongo')
const { summonerSchema, leaderboardSchema, Leaderboard, Summoner } = require('../../schemas/lp_leaderboard')
require('dotenv').config();

module.exports = class LeaderboardCommand extends Command {
    constructor(client){
        super(client, {
            name: 'leaderboard',
            description: "Command to interact with the League of Legends rank leaderboard system.",
            group: 'league',
            memberName: 'leaderboard',
            examples: ["`!leaderboard add Sarinda`", "`!leaderboard remove Sarinda`", "`!leaderboard update`"],
            format: "`!leaderboard <add|remove|update> <summoner name>` (required for `add` and `remove`)",
            argsType: 'multiple',
            // args: [
            //     {
            //         key: 'subcommand',
            //         prompt: 'Which subcommand would you like to invoke? (`add`, `remove`, `update`)',
            //         type: 'string',
            //         oneOf: ['add', 'remove', 'update']
            //     },
            //     {   
            //         key: 'summonerName',
            //         prompt: 'Please enter a summoner name.',
            //         type: 'string'
            //     }
            // ],
            userPermissions: ['ADMINISTRATOR']
        })
    }

    async run(message, args){
        console.log(`Command ${module.exports.name} received from ${message.author.username}`);
        if(!args || args.length < 1){
            // return message.say("Placeholder for leaderboard")
            await mongo().then(async(mongoose) => {
                try {
                    
                } finally {
                    mongoose.connection.close();
                }
            })
        }
        const [ subcommand, ...rest ] = args;
        console.log(rest);
        const summonerName = rest.join(' '); 
        switch(subcommand){
            case 'add':
                console.log('Add operation requested.');
                // if(args.length < 2) return message.say("No summoner name provided, try again.")
                
                const summonerDocument = await this.fetchSummoner(summonerName)
                if(!summonerDocument) return message.say("This summoner does not exist.")

                await mongo().then(async(mongoose) => {
                    try {
                        // Fetch database for document representing the current guild
                        await Leaderboard.findOne({ 'serverId': message.guild.id }, async (err, result) => {
                            if(err) console.error(err)
                            // If document does not exist, create it and add to database with new valid summoner
                            if(!result){
                                await Leaderboard.create(new Leaderboard({
                                    serverId: message.guild.id,
                                    name: message.guild.name
                                }))
                                await Leaderboard.updateOne( { 'serverId': message.guild.id }, { $push: { 'summonerList': summonerDocument._id } })
                            }
                            // Else update with new valid summoner
                            else{
                                let summonerList = result.summonerList;
                                if(!summonerList.some(summoner => summoner.str === summonerDocument._id.str)){
                                    //result.summoners = summonerList;
                                    const res = await Leaderboard.updateOne({ 'serverId': message.guild.id }, { $push: { 'summonerList': summonerDocument._id } });
                                    console.log(`${res.nModified} database(s) modified.`)
                                    message.say(`Added ${summonerDocument.name} to the leaderboard.`);
                                } else {
                                    message.say("This summoner is already on the leaderboard.")
                                }
                            }
                        })
                    } finally {
                        mongoose.connection.close();
                    }
                });
                break;
            case 'remove':
                console.log('Remove operation requested.');
                break;
            case 'update':
                console.log('Update operation requested.');
                break;
            default:
                message.say('Invalid subcommand, please enter one of `add`, `remove`, or `update`.')
        }
    }
    async fetchSummoner(summonerName){
        // Fetch summoner information from Riot API
        const kayn = Kayn(process.env.RIOT_API_KEY)();
        const summoner = await kayn.Summoner.by.name(summonerName);
        if(!summoner) return null;
        var summonerDocument;

        // Query db for summoner, if summoner does not exist then add to db
        await mongo().then(async(mongoose) => {
            try{
                const queriedSummoner = await Summoner.findOne({ summonerId: summoner.id });
                console.log(queriedSummoner)
                if(!queriedSummoner){
                    summonerDocument = new Summoner({
                        summonerId: summoner.id,
                        accountId: summoner.accountId,
                        puuid: summoner.puuid,
                        name: summoner.name,
                        revisionDate: summoner.revisionDate
                    })
                    await summonerDocument.save()
                    console.log("Saving summoner to db...")
                    
                }
                else summonerDocument = queriedSummoner;
            } finally {
                mongoose.connection.close()
            }
        });
        console.log(summonerDocument)
        return summonerDocument;
    }
}

