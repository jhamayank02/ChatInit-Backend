const chatModel = require('../Models/chat');
const messageModel = require('../Models/message');
const userModel = require('../Models/user');
const {emitEvent} = require('../Utils/socketHelpers');
// const cloudinary = require('cloudinary').v2;

const {TryCatch} = require('../Utils/error');
const { REFETCH_MESSAGES } = require('../constants/events');

const sendMessage = TryCatch(async (req, res)=>{
    const {chat_id, content} = req.body;
    const user_id = req.user.id;

    if(content === ''){
        return res.status(401).json({
            status: 401,
            msg: "Messages should atleast contain 1 character"
        })
    }

    const user = await userModel.findById(user_id);
    const chat = await chatModel.findById(chat_id);

    if(chat === null){
        return res.status(401).json({
            status: 401,
            msg: "Group/Chat not found"
        })
    }
    if(!chat.participants.includes(user_id)){
        return res.status(401).json({
            status: 401,
            msg: "To send messages in the group, you must be a member of the group"
        })
    }

    const message = await messageModel.create({message: content, sender: user._id, chat: chat._id});

    res.status(200).json({
        status: 200,
        msg: "Your message has been sent successfully."
    });
})

// TODO
const sendAttachment = TryCatch(async(req, res)=>{
    const {chat_id, user_id, msg} = req.body;

    const attachment = req.file;
    
    if(attachment === undefined){
        return res.status(401).json({
            status: 401,
            msg: "You haven't provided any attachment"
        })
    }

    const chat = await chatModel.findById(chat_id);
    if(chat === null){
        return res.status(401).json({
            status: 401,
            msg: "Group/Chat not found"
        })
    }

    const user = await userModel.findById(user_id);
    if(!chat.participants.includes(user._id)){
        return res.status(401).json({
            status: 401,
            msg: "You must be a member of the group/chat, to send an attachment"
        })
    }

    const message = await messageModel.create({message: msg, sender: user._id, chat: chat._id, attachment: {id: req.file.filename, url: req.file.path, mimetype: req.file.mimetype}, chat: chat._id});
    chat.latestMessage = message._id;
    await chat.save();

    res.status(200).json({
        status: 200,
        msg: "Your attachment sent successfully",
        attachment_url: req.file.path,
        attachment_mimetype: req.file.mimetype
    })
})

const getMessages = TryCatch(async (req, res)=>{
    const {chat_id, page=1} = req.body;
    const user_id = req.user.id;

    const resultsPerPage = 20;
    const skip = (page-1)*resultsPerPage;

    const user = await userModel.findById(user_id);
    const chat = await chatModel.findById(chat_id);

    if(chat === null){
        return res.status(401).json({
            status: 401,
            msg: "Group/Chat not found"
        })
    }
    if(!chat.participants.includes(user_id)){
        return res.status(401).json({
            status: 401,
            msg: "To receive messages from the group/chat, you must be a member of the group/chat"
        })
    }

    const messages = await messageModel
                            .find({chat: chat._id})
                            .sort({createdAt: -1})
                            .skip(skip)
                            .limit(resultsPerPage)
                            .populate("sender", "first_name last_name profilePic");
    const totalMessages = await messageModel.find({chat: chat_id}).countDocuments();
    const totalPages = Math.ceil(totalMessages/resultsPerPage);

    res.status(200).json({
        status: 200,
        messages: messages,
        totalPages
    })
})

const deleteMessage = TryCatch(async (req, res)=>{
    const msg_id = req.body.msg_id;
    const chat_id = req.body.chat_id;

    const msg = await messageModel.findById(msg_id);
    if(!msg){
        return res.status(404).json({
            status: 404,
            msg: "Message not found"
        })
    }

    const chat = await chatModel.findById(chat_id).populate("participants", "_id");
    if(!chat){
        return res.status(404).json({
            status: 404,
            msg: "Chat not found"
        })
    }
    
    await messageModel.findOneAndUpdate({_id: msg._id}, {message: "This message was deleted", deleted: true, attachment: null});
    // await messageModel.deleteMany({_id: msg._id});
    emitEvent(req, REFETCH_MESSAGES, chat.participants);

    res.status(200).json({
        status: 200,
        msg: "Your message has been deleted successfully"
    })
})

module.exports = {sendMessage, getMessages, sendAttachment, deleteMessage};