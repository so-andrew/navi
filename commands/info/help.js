const helpJSON = require('../../data/help.json');
const { Command } = require('discord.js-commando')
const { Collection, MessageEmbed } = require('discord.js');
const fs = require('fs');

module.exports = class HelpCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'help',
            description: "Help function",
            group: 'info',
            memberName: 'help',
            argsType: 'multiple',
            args: [
                {
                    key: 'cmd',
                    prompt: 'Which command do you want to know more about?',
                    type: 'string',
                    default: ""
                }
            ]
        })
    }

    run(message, args) {
        console.log(`Command ${module.exports.name} received from ${message.author.username}`);
        if(!args || !args.length){
            const CommandoRegistry = this.client.registry;
        
            const embed = new MessageEmbed()
                .setTitle("Commands")
                .setColor(3447003)
                .setDescription("An index of commands currently supported by NAVI.")
                .setFooter("Type !help [command] for more info on a specific command.");

                const commandGroups = CommandoRegistry.groups.values();
                console.log(commandGroups);
            
            for(const group of commandGroups){
                if(group.id !== 'util'){
                    let keyString = "";
                    for(let value of group.commands.values()){
                        keyString += `\`${value.name}\`, `
                    }
                    keyString = keyString.substring(0, keyString.length - 2)
                    embed.addField(group.name, keyString);
                }
            }  
            message.embed(embed);
        }
        //else help(message, args);
    }
}


function help(message, args){

}

function helpOld(message, args){
    if(args[0] === "m" || args[0] === "gamemode"){
        const command = message.client.commands.get(args[0]);
        const joinedArgs = args.join(" ");
        if(command.subcommands.includes(joinedArgs)){
            const helpFiles = fetchHelpJSON();
            const help = helpFiles.get(joinedArgs);
            let prefix = "?"
            //if(message.guild) prefix = message.client.guildPrefs.get(message.client.guild.id).prefix;
            const embed = new Discord.RichEmbed()
                .setTitle(`\`${prefix}${help.name}\``)
                .setColor(3447003)
                .setDescription(`${help.desc}`);
            if(help.params) embed.addField("Parameters", help.params);
            else embed.addField("Parameters", "None");
            if(help.exinput) embed.addField("Sample Input", help.exinput);
            if(help.exoutput) embed.addField("Sample Output", help.exoutput);
            return message.channel.send({embed:embed});
        }
        else return message.channel.send("No such command exists.");
    }
    else if(message.client.commands.has(args[0])){
        const command = message.client.commands.get(args[0]);
        let prefix = "?"
        //if(message.guild) prefix = message.client.guildPrefs.get(message.guild.id).prefix;
        const embed = new Discord.RichEmbed()
            .setTitle(`\`${prefix}${command.name}\``)
            .setColor(3447003)
            .setDescription(`${command.description}`);
        if(command.params) embed.addField("Parameters", command.params);
        else embed.addField("Parameters", "None");
        if(command.aliases) embed.addField("Aliases", "\`" + command.aliases.join("\`, \`") + "\`")
        if(command.exinput) embed.addField("Sample Input", command.exinput);
        if(command.exoutput) embed.addField("Sample Output", command.exoutput);
        return message.channel.send({embed:embed});
    }
    else return message.channel.send("No such command exists.");
}
