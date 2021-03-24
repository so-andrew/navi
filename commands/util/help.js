const helpJSON = require('../../data/help.json');
const { Command } = require('discord.js-commando')
const { Collection, MessageEmbed } = require('discord.js');
const fs = require('fs');

module.exports = class HelpCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'help',
            description: "Help function",
            group: 'util',
            memberName: 'help',
            argsType: 'multiple',
        })
    }
    //name: 'help',
    //description: "Help function",

    run(message, args) {
        console.log(`Command ${module.exports.name} received from ${message.author.username}`);
        if(!args || !args.length){
            const commandsWithCategory = this.client.registry.commands.filter(command => command.category);
            const commandCategories = new Discord.Collection();
            const utilCommands = commandsWithCategory.filter(command => command.category === "utility");
            commandCategories.set("Utility Commands", utilCommands);

            const embed = new MessageEmbed()
            
        }
    }

    execute(message, args){
        console.log(`Command ${module.exports.name} received from ${message.author.username}`);
        if(!args || !args.length){
            const commandsWithCategory = message.client.commands.filter(command => command.category);
            const commandCategories = new Discord.Collection();
            const funCommands = commandsWithCategory.filter(command => command.category === "fun");
            commandCategories.set("Fun Commands", funCommands);
            const utilityCommands = commandsWithCategory.filter(command => command.category === "utility");
            commandCategories.set("Utility Commands", utilityCommands);
            const modCommands = commandsWithCategory.filter(command => command.category === "mod");
            commandCategories.set("Mod Commands", modCommands);
            const noveltyCommands = commandsWithCategory.filter(command => command.category === "novelty");
            commandCategories.set("Novelty Commands", noveltyCommands);
            const macroCommands = commandsWithCategory.filter(command => command.category === "macros");
            commandCategories.set("User Macro System", macroCommands);
            const gamemodeCommands = commandsWithCategory.filter(command => command.category === "gamemode");
            commandCategories.set("League Player Rotation", gamemodeCommands);
            const twitchCommands = commandsWithCategory.filter(command => command.category === "twitch");
            commandCategories.set("Twitch Notifications", twitchCommands);

            const embed = new Discord.RichEmbed()
                .setTitle("Commands")
                .setColor(3447003)
                .setDescription("An index of commands currently supported by NAVI.")
                .setFooter("Type !help [command] for more info on a specific command.");

            for(let [key, value] of commandCategories){
                if(value.first() && value.first().subcommands && value.first().subcommands.length !== 0){
                    const commandString = "\`" + value.first().subcommands.join("\`, \`") + "\`";
                    embed.addField(key, commandString);
                }
                else{
                    const keys = Array.from(value.keys());
                    if(keys){
                        const keyString = "\`" + keys.join("\`, \`") + "\`";
                        embed.addField(key, keyString);
                    }
                }
            }
            message.channel.send({embed:embed});
        }
        else help(message, args);
    }
}


function help(message, args)

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
