const { Command } = require('discord.js-commando');
const utils = require("../utils.js");

module.exports = class RandListCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'randomlist',
            aliases: ['randlist'],
            description: "Randomizes a given list.",
            group: 'utility',
            memberName: 'randomlist',
            examples: ["`!randomList \"OK Computer\" | \"Kid A\" | \"In Rainbows\" | \"A Moon Shaped Pool\"`"],
            format: "`!randomlist <element 1> <element 2> ... <element n>` (n > 1)",
            argsType: "multiple"
        })
    }

    run(message, args){
        console.log(`Command ${module.exports.name} received from ${message.author.username}`);
        console.log(args);
        if(!args || !args.length) return message.say("Command usage: `!randomlist [element 1] | [element 2] | ... | [element n]`");
        if(args.length === 1){
            return message.say("You think you're funny, huh?");
        }
        else {
            let list = utils.randomizeArray(args);
            let i = 1;
            let output = "```\n";
            list.forEach((element) => {
                output += `${i}) ${element}\n`;
                i++;
            });
            output += "```";
            return message.say(output);
        }
    }
}
