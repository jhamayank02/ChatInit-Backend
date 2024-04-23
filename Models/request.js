const mongoose = require('mongoose');

const requestSchema = mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users"
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users"
    },
    status: {
        type: String
    }
}, {timestamps: true})

const requestModel = mongoose.model("Requests", requestSchema);

module.exports = requestModel;