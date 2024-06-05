const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { TryCatch } = require('../Utils/error');
const userModel = require('../Models/user');
const otpModel = require('../Models/otp');
const messageModel = require('../Models/message');
const chatModel = require('../Models/chat');
const requestModel = require('../Models/request');
const { emitEvent } = require('../Utils/socketHelpers');
const { REFETCH_CHATS } = require('../constants/events');
const { sendEmail } = require('../Utils/helpers');

const signupHandler = TryCatch(async (req, res) => {

    const { firstname, lastname, email, password } = req.body;

    // Validations
    // if(!(first_name && email && password)){
    //     throw Error("Please fill all the fields");
    // }

    // Check if there is a user with the same email
    const existingUser = await userModel.findOne({ email });

    // There is a user with this email already registered
    if (existingUser && existingUser.verified) {
        return res.status(401).json({
            status: 401,
            msg: "A user with this email already exists"
        })
    }

    // There is a user with this email already registered, but not verified
    if (existingUser && !existingUser.verified) {

        const otp = await otpModel.findOne({email: existingUser.email});

        // If the old OTP expired
        if(!otp){
            // Generate the OTP
            newOtp = generateOTP();

            otp = await otpModel.create({
                email: createdUser.email,
                otp: otp
            })
        }

        sendEmail({receiverEmail: existingUser.email, otp: otp});
        return res.status(200).json({
            status: 200,
            msg: "OTP has been sent to the registered email id",
            verified: false
        })
    }

    // Encrypt the password
    const hashedPassword = await bcryptjs.hash(password, 12);

    // Create the user
    const createdUser = await userModel.create({
        first_name: firstname,
        last_name: lastname ? lastname : "",
        email,
        password: hashedPassword,
        profilePic: { id: req.file.filename, url: req.file.path }
    })

    // Generate the OTP
    const otp = generateOTP();

    const createdOTP = await otpModel.create({
        email: createdUser.email,
        otp: otp
    })

    sendEmail({receiverEmail: createdUser.email, otp: otp});
    return res.status(200).json({
        status: 200,
        msg: "OTP has been sent to the registered email id"
    });
})

const otpVerification = TryCatch(async (req, res) => {
    const { email, otp } = req.body;

    const existingOtp = await otpModel.findOne({ email: email });

    if (existingOtp && existingOtp.otp === otp) {

        const deletedOTP = await otpModel.deleteOne({ email: email });

        // Generate the jwt token
        const existingUser = await userModel.findOne({ email: email });
        existingUser.verified = true;
        existingUser.save();
        const uid = await generateJwtToken(existingUser);
        return res.status(200).json({
            status: 200,
            msg: "OTP verification successful",
            user: {
                id: existingUser._id,
                first_name: existingUser.first_name,
                last_name: existingUser.last_name,
                email: existingUser.email,
                profilePic: existingUser.profilePic.url
            },
            access_token: uid
        })
    }

    return res.status(401).json({
        status: 401,
        msg: "Invalid OTP"
    })
})

const resendOtp = TryCatch(async (req, res) => {

    const { email } = req.body;

    const existingUser = await userModel.findOne({ email: email });

    if (existingUser) {
        if (!existingUser.verified) {
            const existingOtp = await otpModel.findOne({ email: email });

            if (existingOtp) {
                // OTP already exists
                sendEmail({receiverEmail: existingUser.email, otp: existingOtp.otp});
            }
            else {
                // Generate the OTP
                const otp = generateOTP();

                const createdOTP = await otpModel.create({
                    email: existingUser.email,
                    otp: otp
                })
                sendEmail({receiverEmail: existingUser.email, otp: createdOTP.otp});
            }

            return res.status(200).json({
                status: 200,
                msg: "OTP has been sent to your email id"
            })
        }
        else {
            return res.status(200).json({
                status: 200,
                msg: "User has been already verified"
            })
        }
    }

    return res.status(401).json({
        status: 401,
        msg: "User doesn't exist"
    })
})

const loginHandler = TryCatch(async (req, res) => {
    const { email, password } = req.body;

    // Check if email and password are not undefined and valid
    // if(!(email && email.includes("@") && email.includes("."))){
    //     res.status(400);
    //     throw Error("Enter a valid email id");
    // }
    // if(!(password && password.length > 8)){
    //     res.status(400);
    //     throw Error("Password should be atleast 8 characters long");
    // }

    // Check if the user with this email id exists or not
    const existingUser = await userModel.findOne({ email }).select('+password');

    if (!existingUser) {
        return res.status(401).json({
            status: 401,
            msg: "User doesn't exist",
            verified: false
        });
    }
    if (!existingUser.verified) {
        return res.status(200).json({
            status: 200,
            msg: "OTP verification needed for login",
            verified: false
        });
    }

    const verifyPassword = await bcryptjs.compare(password, existingUser.password);

    if (verifyPassword) {
        const uid = await generateJwtToken(existingUser);
        return res.status(200).json({
            status: 200,
            msg: "User logged in successfully",
            user: {
                id: existingUser._id,
                first_name: existingUser.first_name,
                last_name: existingUser.last_name,
                email: existingUser.email,
                profilePic: existingUser.profilePic.url,
            },
            access_token: uid,
            verified: true
        });
    }

    res.status(401).json({
        status: 401,
        msg: "Make sure you have entered the correct password",
        verified: false
    });
})

const generateJwtToken = async (user) => {
    try {
        const token = await jwt.sign({
            id: user._id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name
        }, process.env.JWT_SECRET_KEY, { expiresIn: '1d' });

        return token;
    }
    catch (err) {
        // console.log(err.message);
    }
}

const generateOTP = () => {
    let otp = '';

    for (let i = 0; i < 4; i++) {
        otp += Math.floor(Math.random() * 10);
    }

    return otp;
}

const isLoggedIn = async (req, res) => {
    // console.log(req.cookies)
    const uid = req.cookies?.uid;

    try {
        const verifyToken = await jwt.verify(uid, process.env.JWT_SECRET_KEY);
        const user = await userModel.findById(verifyToken.id);

        if (verifyToken) {

            // TODO -> INVALIDATE THE PREVIOUSE TOKEN

            const newToken = await jwt.sign({
                id: user._id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name
            }, process.env.JWT_SECRET_KEY, { expiresIn: '1d' })

            return res.status(200).json({
                status: 200,
                msg: "User logged in successfully",
                user: {
                    id: user._id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email,
                    profilePic: user.profilePic.url,
                    joined: user.createdAt
                },
                access_token: newToken
            });
        }

        return res.status(401).json({
            status: 401,
            msg: "Session expired, login again"
        });
    }
    catch (err) {
        return res.status(401).json({
            status: 401,
            msg: "Session expired, login again"
        });
    }

}

const deleteAccount = TryCatch(async (req, res)=>{
    const user_id = req.user.id;

    const user = await userModel.findById(user_id);
    
    // Delete all the chats, messages and attachments from cloudinary
    const chats = await chatModel.find({is_group_chat: false, participants: {$in: [user._id]}});
    
    // Deleting messages of the individual chats
    for(let chat of chats){
        await messageModel.deleteMany({chat: chat});        
    }
    
    // Deleting all individual chats
    await chatModel.deleteMany({is_group_chat: false, participants: {$in: [user._id]}});
    
    // Deleting messages of the group chats
    const groupChats = await chatModel.find({is_group_chat: true, participants: {$in: [user._id]}});
    
    // Deleting messages of the group chats
    for(let groupChat of groupChats){
        await messageModel.deleteMany({chat: groupChat, sender: user._id});
    }

    // Groups where the user is admin, change admins there
    for(groupChat of groupChats){
        if(user._id.toString() === groupChat.group_admin.toString()){
            // Make the first participant admin
            if(groupChat.participants.length > 1){                
                let new_admin;

                for(let participant of groupChat.participants){
                    if(participant.toString() !== user._id.toString()){
                        new_admin = participant;
                        break;
                    }
                }
                await chatModel.findOneAndUpdate({_id: groupChat._id}, {group_admin: new_admin}); 
            }
            // If there are no more participants, delete the group
            else{
                await messageModel.deleteMany({chat: groupChat._id, group_admin: user_id});
                await chatModel.deleteOne({_id: groupChat._id});
            }

            const remainingParticipants = groupChat.participants.filter(participant => participant.toString !== user._id.toString());
            emitEvent(req, REFETCH_CHATS, remainingParticipants);
        }
    }
    
    // Delete all the requests where the user is sender
    await requestModel.deleteMany({sender: user._id});

    // Deleting user profile
    await userModel.deleteOne(user._id);

    res.status(200).json({
        status: 200,
        msg: "Your account has been deleted successfully"
    })
})


const isAuthorized = async (req, res, next) => {
    const uid = req.cookies?.uid

    try {
        const verifyToken = await jwt.verify(uid, process.env.JWT_SECRET_KEY);

        if (verifyToken) {
            req.user = {
                id: verifyToken.id,
                email: verifyToken.email
            };
            next();
        }
        else {
            return res.status(401).json({
                status: 401,
                msg: "Session expired, login again"
            });
        }
    }
    catch (err) {
        return res.status(401).json({
            status: 401,
            msg: "Session expired, login again"
        });
    }
}

const logoutHandler = TryCatch(async (req, res)=>{
    // TODO -> Invalidate the jwt tokens
    // const uid = req.body.uid;

    res.status(200).json({
        status: 200,
        msg: "You have logged out successfully"
    })
})

module.exports = { signupHandler, loginHandler, isLoggedIn, otpVerification, resendOtp, isAuthorized, deleteAccount, logoutHandler };