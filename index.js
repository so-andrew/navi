const Commando = require('discord.js-commando');
const Discord = require('discord.js');
const path = require('path')
const fs = require('fs');
const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');
const utils = require('./commands/utils.js');
const MongoClient = require('mongodb').MongoClient;
require('dotenv').config();

const client = new Commando.Client({
    owner: process.env.OWNER_ID
})

//client.commands = new Discord.Collection();
client.coins = [];

client.registry
    .registerDefaultTypes()
    .registerGroups([
        ['info', 'Info'],
        ['utility', 'Utility'],
        ['league', 'League of Legends']
    ])
    .registerDefaultGroups()
    .registerDefaultCommands({
        help: false,
        unknownCommand: false,
    })
    .registerCommandsIn(path.join(__dirname, 'commands'))

client.setProvider(
    sqlite.open({ filename: 'command.db', driver: sqlite3.Database
}).then(db => new Commando.SQLiteProvider(db))
).catch(console.error);

// Initializing event handlers
fs.readdir("./events/", (err, files) => {
    if(err) return console.error(err);
    files.forEach(file => {
        let eventFunction = require(`./events/${file}`);
        let eventName = file.split(".")[0];
        client.on(eventName, (...args) => eventFunction.run(client, ...args));
    });
});

// Initializing MongoDB connection



// Initializing coin imades for coinflip command
const coinFiles = fs.readdirSync('./resources/coins').filter(file => file.endsWith('.png'));
for(const file of coinFiles){
    client.coins.push(`${file.substring(0, file.indexOf('.'))}`);
}

client.login(process.env.TOKEN)
    .then(() => {
        client.coins = utils.randomizeArray(client.coins)
    }).catch((error) => {
        console.log(error);
    });