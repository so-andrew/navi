module.exports = {
    name: 'time',
    description: "Returns current time.",
    category: "utility",
    execute(message){
        console.log(`Command ${module.exports.name} received from ${message.author.username}`);
        const d = new Date();
        message.channel.send(`It is ${d.toLocaleTimeString('en-US', { timeZone: 'America/New_York' })}.`);
    }
}
