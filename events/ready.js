const mongo = require('../mongo')

exports.run = async (client) => {
    console.log("Logged in as: ");
    console.log(`${client.user.username} - (${client.user.id})`);
}