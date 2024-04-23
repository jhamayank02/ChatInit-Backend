const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

const messageSchema = mongoose.Schema({
    message: {
        type: String,
    },
    attachment: {
        id: String,
        url: String,
        mimetype: String
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users"
    },
    deleted: {
        type: Boolean,
        default: false
    },
    delivered: {
        type: Boolean,
        default: false
    },
    read: {
        type: Boolean,
        default: false
    },
    chat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chat"
    }
}, {timestamps: true});

// Delete attachment from cloudinary, when deleting the message
messageSchema.pre("findOneAndUpdate", { document: true, query: true }, async function(next){
    const docToUpdate = await this.model.findOne(this.getQuery());
    if(docToUpdate?.attachment?.id !== undefined){
        await cloudinary.uploader.destroy(docToUpdate?.attachment?.id);
    }
    next();
});

// Delete attachment from cloudinary, when deleting the message
messageSchema.pre("deleteOne", { document: true, query: true }, async function(next){
    const docToDelete = await this.model.findOne(this.getQuery());
    if(docToDelete?.attachment?.id !== undefined){
        await cloudinary.uploader.destroy(docToDelete?.attachment?.id);
    }
    next();
});

// Delete attachment from cloudinary, when deleting the message
messageSchema.pre("deleteMany", { document: true, query: true }, async function (next){
    const docsToDelete = await this.model.find(this.getQuery());

    for(let docToDelete of docsToDelete){
        if(docToDelete?.attachment?.id !== undefined){
            await cloudinary.uploader.destroy(docToDelete?.attachment?.id);
        }
    }
    next();
});

const messageModel = mongoose.model("Messages", messageSchema);

module.exports = messageModel;