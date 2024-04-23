const { storage } = require('./storage');
const multer = require('multer');
const nodemailer = require('nodemailer');
require('dotenv').config();

const upload = multer({
    storage: storage
});

const transporter = nodemailer.createTransport({
    port: 465,               // true for 465, false for other ports
    host: "smtp.gmail.com",
    auth: {
        user: process.env.EMAIL_ID,
        pass: process.env.PASS
    },
    secure: true,
});

const sendEmail = (data)=>{

    const mailData = {
          from: process.env.EMAIL_ID,  // sender address
          to: data?.receiverEmail,   // list of receivers
          subject: 'ChatInit Email Verification',
          text: `${data?.otp} is your OTP(One Time Password) for email verification, valid for 15 minutes. Please do not share this with anyone.`
    };

    transporter.sendMail(mailData, function(err, info){
        if(err){
            // console.log(err);
        }
        else{
            // console.log(info);
        }
    })
}

module.exports = { upload, sendEmail };