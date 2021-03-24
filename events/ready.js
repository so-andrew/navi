
exports.run = (client) => {
    console.log("Logged in as: ");
    console.log(`${client.user.username} - (${client.user.id})`);
}