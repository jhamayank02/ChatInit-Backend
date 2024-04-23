const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

const userSchema = mongoose.Schema({
    first_name: {
        type: String,
        required: [true, "first_name is a required field"]
    },
    last_name: {
        type: String,
        default: ""
    },
    email: {
        type: String,
        required: [true, "email is a required field"],
        unique: [true, "A user with this email already exists"]
    },
    password: {
        type: String,
        required: [true, "password is a required field"],
        select: false
    },
    profilePic: {
        id: String,
        url: String
    },
    verified: {
        type: Boolean,
        default: false
    }
}, {timestamps: true})

// Delete profilePic from cloudinary, when deleting the user
userSchema.pre("deleteOne", { document: true, query: true }, async function(next){
    const docToDelete = await this.model.findOne(this.getQuery());
    if(docToDelete?.profilePic?.id !== undefined){
        await cloudinary.uploader.destroy(docToDelete?.profilePic?.id);
    }
    next();
});

const userModel = mongoose.model("Users", userSchema);

module.exports = userModel;