const { Command } = require('discord.js-commando');
const { MessageEmbed, Message } = require('discord.js');

module.exports = class AvatarCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'avatar',
            description: "Returns the avatar of the mentioned user, or if no one is mentioned, returns the avatar of the invoking user.",
            group: 'utility',
            memberName: 'avatar'
        })
    }
    
    //category: "utility",
    //params: "`@mention` (optional)",
    //cooldown: 3,
    
    // TODO: Rewrite using Commando args 

    run(message, args){
        console.log(`Command ${module.exports.name} received from ${message.author.username}`);
        const embed = new MessageEmbed();
        if(!args || !args.length){
            embed.setImage(message.author.avatarURL())
            if(message.channel.type === "dm") embed.setColor(3447003);
            else embed.setColor(message.member.displayHexColor);
        }
        else{
            if(!message.mentions.users) return message.say("Invalid parameters, please mention a user.");
            embed.setImage(message.mentions.users.first().avatarURL())
            if(message.channel.type === "dm") embed.setColor(3447003);
            else embed.setColor(message.mentions.members.first().displayHexColor);
        }
        message.embed(embed);
    }
}
