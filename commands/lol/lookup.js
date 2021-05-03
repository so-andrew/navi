const { Command } = require('discord.js-commando')
const { MessageEmbed } = require('discord.js')
const { Kayn, REGIONS } = require('kayn')
const Vibrant = require('node-vibrant')
const mergeImages = require('merge-images')
const { Canvas, Image } = require('canvas')
const fs = require('fs')
require('dotenv').config();

const rankDict = {
    "I": 'd1',
    "II": 'd2',
    "III": 'd3',
    "IV": 'd4'
}

const rankCrestFolders = {
    "IRON": "01_iron",
    "BRONZE": "02_bronze",
    "SILVER": "03_silver",
    "GOLD": "04_gold",
    "PLATINUM": "05_platinum",
    "DIAMOND": "06_diamond",
    "MASTER": "07_master",
    "GRANDMASTER": "08_grandmaster",
    "CHALLENGER": "09_challenger"
}

module.exports = class LookupCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'rank',
            aliases: ['lol'],
            description: "Fetches the current League of Legends rank of the specified player.",
            group: 'league',
            memberName: 'rank',
            examples: ["`!rank Sarinda`"],
            format: "`!rank <summoner name>` (required)",
            args: [
                {
                    key: 'name',
                    prompt: 'Who would you like to look up?',
                    type: 'string',
                }
            ],
            throttling: {
                usages: 5,
                duration: 10
            }
        })
    }

    async run(message, { name }) {
        console.log(`Command ${module.exports.name} received from ${message.author.username}`);
        const kayn = Kayn(process.env.RIOT_API_KEY)();
        const summoner = await kayn.Summoner.by.name(name);
        console.log(summoner);
        const league_info = await kayn.League.Entries.by.summonerID(summoner.id);
        console.log(league_info);
        let rankString = ""
        let rankedSolo
        let crestImage = ""
        if(!league_info || !league_info.length){
            rankString = "unranked in Ranked Solo/Duo"
        }
        else{
            rankedSolo = await league_info.filter(league => league.queueType === 'RANKED_SOLO_5x5')[0];
            rankString = `${rankedSolo.tier} ${rankedSolo.rank}, ${rankedSolo.leaguePoints} LP`
            const baseCrest = `./resources/rankedcrests/${rankCrestFolders[rankedSolo.tier]}/${rankedSolo.tier.toLowerCase()}_baseface_matte.png`;
            let crown = `./resources/rankedcrests/${rankCrestFolders[rankedSolo.tier]}/${rankedSolo.tier.toLowerCase()}_crown`;
            if(rankedSolo.tier === "MASTER" || rankedSolo.tier === "GRANDMASTER" || rankedSolo.tier === "CHALLENGER"){
                crown += '.png'
            }
            else{
                crown += `_${rankDict[rankedSolo.rank]}.png`
            }

            mergeImages([baseCrest, crown], {
                Canvas: Canvas,
                Image: Image
            })
            .then(async(b64) => {
                try{
                    let data = b64.replace(/^data:image\/\w+;base64,/, '');
                    fs.writeFileSync(`./resources/rankedcrests/${rankCrestFolders[rankedSolo.tier]}/${rankedSolo.tier.toLowerCase()}_crest_${rankDict[rankedSolo.rank]}.png`, data, { encoding: 'base64' });
                } catch(err) {
                    console.error(err)
                }
            })
        }
        
        //message.say(`${summoner.name} is currently ${rankedSolo.tier} ${rankedSolo.rank} ${rankedSolo.leaguePoints} LP.`);
        const v = new Vibrant(`./dragontail-11.8.1/11.8.1/img/profileicon/${summoner.profileIconId}.png`);
        const palette = await v.getPalette();
        const embed = new MessageEmbed()
            .setTitle(`${summoner.name}'s Current Rank`)
            .setDescription(`${summoner.name} is currently **${rankString}.**`)
            .setColor(palette["Vibrant"].getRgb())
            .setFooter(`Current Time: ${new Date().toLocaleString()}`)
        if(rankedSolo){
            embed.attachFiles([`./dragontail-11.8.1/11.8.1/img/profileicon/${summoner.profileIconId}.png`, `./resources/rankedcrests/${rankCrestFolders[rankedSolo.tier]}/${rankedSolo.tier.toLowerCase()}_crest_${rankDict[rankedSolo.rank]}.png`])
            embed.setImage(`attachment://${summoner.profileIconId}.png`)
            embed.setThumbnail(`attachment://${rankedSolo.tier.toLowerCase()}_crest_${rankDict[rankedSolo.rank]}.png`)  
        }
        else{
            embed.attachFiles([`./dragontail-11.8.1/11.8.1/img/profileicon/${summoner.profileIconId}.png`])
            embed.setImage(`attachment://${summoner.profileIconId}.png`)
        }
        message.embed(embed)
    
    }
}