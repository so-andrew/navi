module.exports = {
    name: 'clean',
    description: "Deletes previous messages.",
    params: "`Integer` (required)",
    exinput: "`!clean 5`",
    exoutput: "Deleted `5 messages`. <:dab:310668328794587138>",
    category: "mod",
    guildOnly: true,
    execute(message, args){
        console.log(`Command ${module.exports.name} received from ${message.author.username}`);
        if(message.channel.type === "dm") return message.channel.send("Cannot delete messages in a DM channel.");
        if(!message.member.hasPermission("MANAGE_MESSAGES")) return message.channel.send("You do not have the proper permissions to use this command.");
        if(args && args.length) clean(message, args);
        else message.channel.send("Please input a valid number of messages to delete.");
      }
}

async function clean(message, args){
    if(!isNaN(args)){
        let pluralString = args[0] == 1 ? "" : "s";
        const messageCollection = await message.channel.fetchMessages({limit: parseInt(args) + 1});
        await message.channel.bulkDelete(messageCollection).catch(error => console.log(error.stack));
        const sentMessage = await message.channel.send(`Deleted ${args} message${pluralString}. <:dab:310668328794587138>`);
        await sentMessage.delete(3000);
    }
    else message.channel.send("Please enter a numerical argument.");
}
