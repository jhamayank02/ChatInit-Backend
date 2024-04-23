const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

const chatSchema = mongoose.Schema({
    chatName: {
        type: String,
        trim: true
    },
    groupProfilePic: {
        id: String,
        url: String
    },
    is_group_chat: {
        type: Boolean,
        default: false
    },
    group_admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users"
    },
    participants: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users"
        }
    ],
    latestMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Messages"
    }
}, {timestamps: true});


// Delete profilePic from cloudinary, when deleting the group chat
chatSchema.pre("deleteOne", { document: true, query: true }, async function(next){
    const docToDelete = await this.model.findOne(this.getQuery());
    if(docToDelete?.groupProfilePic?.id !== undefined){
        await cloudinary.uploader.destroy(docToDelete?.groupProfilePic?.id);
    }
    next();
});

// Delete profilePic from cloudinary, when deleting the group chat
chatSchema.pre("deleteMany", { document: true, query: true }, async function (next){
    const docsToDelete = await this.model.find(this.getQuery());

    for(let docToDelete of docsToDelete){
        if(docToDelete?.groupProfilePic?.id !== undefined){
            await cloudinary.uploader.destroy(docToDelete?.groupProfilePic?.id);
        }
    }
    next();
});

const chatModel = mongoose.model('Chats', chatSchema);

module.exports = chatModel;