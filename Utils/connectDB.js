require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
    try{
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("DB connected successfully...");
    }
    catch(err){
        console.log(err.message);
    }
}

module.exports = connectDB;