const { Command } = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');

module.exports = class AboutCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'about',
            description: "About message for NAVI.",
            group: 'info',
            memberName: 'about'
        });
    }

    run(message) {
        console.log(`Command ${module.exports.name} received from ${message.author.username}`);
        const embed = new MessageEmbed()
            .setTitle("**NAVI** - Knowledge Navigator")
            .setDescription("Created by <@197598081867448320> using the Discord.js JavaScript library")
            .attachFiles(["./resources/navi.jpg"])
            .setThumbnail("attachment://navi.jpg")
            .setColor("BLUE")
            .addField("Current Version", "1.0", true)
            .addField("GitHub Repository", "https://github.com/so-andrew/navi/", true);
        message.embed(embed);
    }
}
