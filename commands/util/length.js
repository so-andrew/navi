module.exports = {
    name: "length",
    description: "Returns the length of a given input string.",
    category: "utility",
    params: "`String` (required)",
    exinput: "`!length Mississippi`",
    exoutput: "The string `Mississippi` is `11` characters long.",
    cooldown: 3,
    execute(message, args){
        console.log(`Command ${module.exports.name} received from ${message.author.username}`);
        if(!args || !args.length) return message.channel.send("Please input a valid string.");
        let string = args.join(' ');
        message.channel.send(`The string \`${string}\` is \`${string.length}\` characters long.`);
    }
}
