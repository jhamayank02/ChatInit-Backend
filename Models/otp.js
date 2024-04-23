const mongoose = require('mongoose');

const otpSchema = mongoose.Schema({
    email: {
        type: String,
        unique: true,
        required: [true, "email is a required field"]
    },
    otp: {
        type: String,
        required: [true, "otp is a required field"]
    },
    createdAt: { type: Date, expires: '15m', default: Date.now }
})

const otpModel = mongoose.model("OTP", otpSchema);

module.exports = otpModel;