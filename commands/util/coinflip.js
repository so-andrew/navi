const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');
const Vibrant = require('node-vibrant');

module.exports = class CoinflipCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'coinflip',
            aliases: ['flip', 'coin'],
            description: "Flips a coin.",
            group: 'util',
            memberName: ' coinflip',
            args: [
                {
                    key: 'num',
                    prompt: 'How many coins to flip?',
                    type: 'integer',
                    default: 1,
                    validate: num => num > 0 && num <= 100,
                },
            ],
        })
    }

    //name: 'coinflip',
    //aliases: ['flip', 'coin'],
    //description: "Flips a coin.",
    //params: "`[number]` (optional)",
    //category: "utility",
    //cooldown: 2,
    
    async run(message, { num }){
        console.log(`Command ${module.exports.name} received from ${message.author.username}`);
        coinflip(message, num);
    }

}

async function coinflip(message, times){
    if(times === 1){
        const embed = new MessageEmbed();
        if(Math.floor(Math.random() * 10) % 2 === 0.0){
            const coin = message.client.coins[Math.floor(Math.random() * message.client.coins.length)];
            let v = new Vibrant(`./resources/coins/${coin}.png`);
            const palette = await v.getPalette();
            embed.setTitle("**Heads!**");
            embed.attachFiles([`./resources/coins/${coin}.png`]);
            embed.setImage(`attachment://${coin}.png`);
            embed.setColor(palette["Vibrant"].getRgb());
        }
        else{
            embed.setTitle("**Tails!**");
            embed.attachFiles([`./resources/tails.png`]);
            embed.setImage(`attachment://tails.png`);
        }
        return message.embed(embed);
    }
    else{
        //let outcomes = [];
        let headsCount = 0;
        for(i = 0; i < times; i++){
            if(Math.floor(Math.random()*2)+1 === 1){
                headsCount++;
                //outcomes.push("Heads");
            }
            //else outcomes.push("Tails");
        }
        let outputString = "";
        const embed = new MessageEmbed()
            .setTitle("**Results**")
            .addField("Heads", headsCount, true)
            .addField("Tails", times - headsCount, true);
        if(headsCount === 0){
            outputString = `You flipped ${times} coins, ${headsCount} of which were heads and ${times - headsCount} were tails.`;
            embed.attachFiles([`./resources/tails.png`]);
            embed.setThumbnail(`attachment://tails.png`);
        }
        else{
            let pluralHeads = " were ";
            let pluralTails = " were ";
            if(headsCount === 1) pluralHeads = " was ";
            if(times - headsCount === 1) pluralTails = " was ";
            outputString = `You flipped ${times} coins, ${headsCount} of which` + pluralHeads + `heads and ${times - headsCount}` + pluralTails + `tails.`;
            const coin = message.client.coins[Math.floor(Math.random() * message.client.coins.length)];
            let v = new Vibrant(`./resources/coins/${coin}.png`);
            const palette = await v.getPalette();
            embed.attachFiles([`./resources/coins/${coin}.png`])
            embed.setThumbnail(`attachment://${coin}.png`)
            embed.setColor(palette["Vibrant"].getRgb())
        }
        embed.setDescription(outputString);
        return message.embed(embed);
    }
}
