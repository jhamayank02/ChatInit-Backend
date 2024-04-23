const express = require('express');
const {Server} = require('socket.io');
const {createServer} = require('http');

const app = express();
const server = createServer(app);
const io = new Server(server, {cors: {origin: "http://localhost:3000", credentials: true}});
app.set("io", io);

const cookieParser = require('cookie-parser');
const {v4:uuid} = require('uuid');
// const formData = require("express-form-data");
const cors = require('cors');

const connectDB = require('./Utils/connectDB');
// const {globalErrorHandler} = require('./Utils/globalErrorHandler');

const authRoutes = require('./Routes/auth');
const usersRoutes = require('./Routes/users');
const messageRoutes = require('./Routes/messages');
const requestsRoutes = require('./Routes/requests');
const { errorMiddleware } = require('./Utils/error');
const { NEW_MESSAGE, NEW_MESSAGE_ALERT, NEW_ATTACHMENT, START_TYPING, STOP_TYPING, CHAT_JOINED, ONLINE_USERS, CHAT_LEFT } = require('./constants/events');
const { getSockets } = require('./Utils/socketHelpers');
const messageModel = require('./Models/message');
const { socketAuthenticator } = require('./middlewares/auth');
const chatModel = require('./Models/chat');
const { isAuthorized } = require('./Controllers/auth');

const PORT = 80;
const userSocketIDs = new Map();
const onlineUsers = new Set();

app.use(cors({
    origin: [
        "https://jhamayank02.github.io/"
      ],
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
}))
// app.use(cors({credentials: true, origin: 'http://localhost:3000', exposedHeaders: ['Set-Cookie']}));
// app.use(cors({credentials: true, SameSite: "Lax", origin: 'http://localhost:3000'}));
// app.use(cors({credentials: true, origin: 'http://localhost:3000'}));
// app.use(cors({credentials: true, SameSite: "None", origin: 'http://localhost:3000'}));
// app.set("trust proxy", 1);
app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(formData.parse());
app.use(cookieParser());

app.use('/api/auth', authRoutes);

app.use('/api/users', isAuthorized, usersRoutes);

app.use('/api/requests', isAuthorized, requestsRoutes);

app.use('/api/messages', messageRoutes);

app.use(errorMiddleware);

io.use((socket, next)=>{
    cookieParser()(socket.request, socket.request.res, async (err)=> await socketAuthenticator(err, socket, next))
})

io.on("connection", (socket) => {
    const user = socket.user;
    // console.log(user);
    userSocketIDs.set(user._id.toString(), socket.id);

    // console.log("A user connected", socket.id);
    // console.log(userSocketIDs);

    socket.on(NEW_MESSAGE, async ({chatId, participants, message})=>{

        const messageForRealTime = {
            content: message,
            // _id: uuid(),
            sender: {
                _id: user._id,
                first_name: user.first_name,
                last_name: user.last_name
            },
            chat: chatId,
            createdAT: new Date().toISOString()
        }

        const messageForDB = {
            message: message,
            sender: user._id,
            chat: chatId
        }

        const participantsSocket = getSockets(participants);
        
        try{
            const latestMessage = await messageModel.create(messageForDB);
            messageForRealTime._id = latestMessage._id;
            io.to(participantsSocket).emit(NEW_MESSAGE, {
                chatId, message: messageForRealTime
            })
            io.to(participantsSocket).emit(NEW_MESSAGE_ALERT, {chatId, senderId: user._id})
            await chatModel.findOneAndUpdate({_id: chatId}, {latestMessage: latestMessage._id});
        }
        catch(error){
            // console.log(error.message);
        }
    })

    socket.on(CHAT_JOINED, ({participants, userId})=>{
        onlineUsers.add(userId.toString());

        // console.log(onlineUsers)
        const participantsSockets = getSockets(participants);
        socket.to(participantsSockets).emit(ONLINE_USERS, Array.from(onlineUsers));
    })

    socket.on(CHAT_LEFT, ({userId, participants})=>{
        onlineUsers.delete(userId.toString());

        // console.log(onlineUsers)
        const participantsSockets = getSockets(participants);
        socket.to(participantsSockets).emit(ONLINE_USERS, Array.from(onlineUsers));
    })

    socket.on(START_TYPING, ({participants, chatId})=>{
        const participantsSockets = getSockets(participants);
        socket.to(participantsSockets).emit(START_TYPING, {chatId});
    })

    socket.on(STOP_TYPING, ({participants, chatId})=>{
        const participantsSockets = getSockets(participants);
        socket.to(participantsSockets).emit(STOP_TYPING, {chatId});
    })

    socket.on(NEW_ATTACHMENT, async({chatId, members, message, attachment_url, attachment_mimetype})=>{
        const messageForRealTime = {
            content: message,
            attachment_url: attachment_url,
            attachment_mimetype: attachment_mimetype,
            _id: uuid(),
            sender: {
                _id: user._id,
                first_name: user.first_name,
                last_name: user.last_name
            },
            chat: chatId,
            createdAT: new Date().toISOString()
        }

        const membersSocket = getSockets(members);
        io.to(membersSocket).emit(NEW_ATTACHMENT, {
            chatId, message: messageForRealTime
        })
        io.to(membersSocket).emit(NEW_MESSAGE_ALERT, {chatId})
    })

    socket.on("disconnect", ()=>{
        userSocketIDs.delete(user._id.toString());
        // console.log("User disconnected")
    })
})

server.listen(PORT, ()=>{
    connectDB();
    // console.log("Server started on port " + PORT + "...");
})

// module.exports = {userSocketIDs};
exports.userSocketIDs = userSocketIDs;