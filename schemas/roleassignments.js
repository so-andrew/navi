const mongoose = require('mongoose');


const roleAssignment = mongoose.Schema({
	roleId: String,
	channelId: String,
	guildId: String,
});

const roleAssignmentSchema = mongoose.model('roleassignments', roleAssignment);

module.exports = { RoleAssignment: roleAssignmentSchema };