module.exports = {
    name: 'choose',
    aliases: ['choice', 'chose'],
    description: "Chooses from a given list of options.",
    params: "`[choice 1] | [choice 2] | ... | [choice n]` (n > 1)",
    exinput: "`!choose The Legend of Zelda | Metroid | Super Mario`",
    exoutput: "Choose `The Legend of Zelda`, you won't.",
    category: "utility",
    responses: [["Hmmm... how about ", "?"],["Choose ", ", you won't."],["It was my destiny to choose ", "."],["Obviously I'm going to choose ", "."],["The law requires that I choose ","."],["", " is the definitive answer."], ["Did you ever hear the tragedy of ", "? I thought not. It's not a story the Jedi would tell you."],[""," or bust."]],
    cooldown: 3,
    execute(message, args){
        console.log(`Command ${module.exports.name} received from ${message.author.username}`);
        if(!args || !args.length) return message.channel.send("Command usage: `!choose [choice 1] | [choice 2] | ... | [choice n]`");
        if(args.length === 1){
            if(args[0].split('|').length < 2) return message.channel.send("You think you're funny, huh?");
        }
        else if(args.join('').indexOf('|') === -1){
            return message.channel.send("Your choices are not separated by \`|\` which may lead to unexpected results. Please try again.");
        }
        let choices = [];
        args.join(' ').split('|').forEach((element) => {
            if(element.trim() !== '') choices.push(element.trim());
        });
        if(choices.length === 0) return message.channel.send("There are no valid choices, try again.");
        let chosen = choices[Math.floor(Math.random() * choices.length)];
        console.log(`${chosen} chosen from list.`);
        let response = module.exports.responses[Math.floor(Math.random() * module.exports.responses.length)];
        if(response[0] === "") chosen = chosen[0].toUpperCase() + chosen.substring(1);
        message.channel.send(`${response[0]}\`${chosen}\`${response[1]}`);
    }
}
