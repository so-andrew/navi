const Discord = require('discord.js');

exports.run = async (client, message) => {
    // Ignore bot messages
    if(message.author.bot) return;

    // Non-command features
    let prefix = process.env.PREFIX;
    
    //TODO: MongoDB backend for guild preferences
    /*if(message.guild){
        if(client.guildPrefs.has(message.guild.id)){
            prefix = client.guildPrefs.get(message.guild.id).prefix;
        }
    }*/

    // Command checks
    // if(message.content.startsWith(prefix)){
    //     // Determine what command is being invoked
    //     const args = message.content.slice(prefix.length).trim().split(/ +/g);
    //     const cmdName = args.shift().toLowerCase();
    //     //if(!client.commands.has(cmdName)) return;

    //     const command = client.commands.get(cmdName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(cmdName));
    //     if(!command) return;

    //     // Check activation conditions
    //     if(command.guildOnly && message.channel.type !== "text") return message.channel.send("This command can only be used in a guild text channel.");
    //     //if(command.offensive && !offensiveAllowed) return message.channel.send("This command has been disabled.");
    //     if(!client.cooldowns.has(command.name)) client.cooldowns.set(command.name, new Discord.Collection());
    //     const now = Date.now();
    //     const timestamps = client.cooldowns.get(command.name);
    //     const cdAmount = (command.cooldown || 3) * 1000;
    //     if(timestamps.has(message.author.id)){
    //         const expTime = timestamps.get(message.author.id) + cdAmount;
    //         if(now < expTime){
    //             const timeLeft = (expTime - now) / 1000;
    //             const warningMessage = await message.reply(`you cannot use the \`${command.name}\` command for ${timeLeft.toFixed(1)} second(s).`);
    //             warningMessage.delete(3000);
    //         }
    //     }
    //     if(message.author.id !== process.env.OWNER_ID){
    //         timestamps.set(message.author.id, now);
    //         setTimeout(() => timestamps.delete(message.author.id), cdAmount);
    //     }

    //     // Command execution
    //     if(!disableCheck(client, cmdName)){
    //         try{
    //             command.execute(message, args);
    //         }
    //         catch(err){
    //             console.error(err);
    //         }
    //     }
    // }
};

function disableCheck(client, cmd){
    return client.disable.has(cmd);
}