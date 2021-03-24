
// Importing required modules
const Discord = require('discord.js');
const client = new Discord.Client();

const fs = require('fs');
const express = require('express');
const app = express();
const utils = require("./commands/utils.js");
require('dotenv').config();

// Client properties
client.disable = new Discord.Collection();
client.commands = new Discord.Collection();
client.cooldowns = new Discord.Collection();
client.coins = [];

// Initialiizing command files
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for(const file of commandFiles){
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

// Initializing event handlers
fs.readdir("./events/", (err, files) => {
    if(err) return console.error(err);
    files.forEach(file => {
        let eventFunction = require(`./events/${file}`);
        let eventName = file.split(".")[0];
        client.on(eventName, (...args) => eventFunction.run(client, ...args));
    });
});

// Initializing coin imades for coinflip command
const coinFiles = fs.readdirSync('./resources/coins').filter(file => file.endsWith('.png'));
for(const file of coinFiles){
    client.coins.push(`${file.substring(0, file.indexOf('.'))}`);
}

// Login to Discord
client.login(process.env.TOKEN)
    .then(() => {
        client.coins = utils.randomizeArray(client.coins);
    }).catch((error) => {
        console.log(error);
    });