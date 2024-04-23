const index = require('../index');

const getSockets = (users=[])=>{
    const sockets = users.map(user => index.userSocketIDs.get(user['_id'].toString()));
    return sockets;
}

const emitEvent = (req, event, users, data)=>{
    const io = req.app.get("io");
    const usersSocket = getSockets(users);
    io.to(usersSocket).emit(event, data);
}

module.exports = {getSockets, emitEvent};