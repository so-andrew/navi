module.exports = {
    name: 'reload',
    description: "Reloads the specified command.",
    dev: true,
    async execute(message, args){
        console.log(`Command ${module.exports.name} received from ${message.author.username} with arguments ${args[0]}`);
        if(!args || !args.length) return message.channel.send("Please specify a command to reload.");
        else{
            try{
                delete require.cache[require.resolve(`./${args[0]}.js`)];
                const command = require(`./${args[0]}.js`);
                message.client.commands.set(command.name, command);
                const sentMessage = await message.channel.send(`The \`${args[0]}\` command has been reloaded.`)
                if(message.channel.type !== "dm"){
                    sentMessage.delete(3000);
                    message.delete(3000);
                }
            }
            catch(err){
                console.error(err);
            }
        }
    }
}
