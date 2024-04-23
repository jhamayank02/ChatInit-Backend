const jwt = require('jsonwebtoken');
const { ErrorHandler } = require('../Utils/error');
const userModel = require('../Models/user');

const socketAuthenticator = async (err, socket, next)=>{
    try{
        if(err){
            return next(err);
        }

        const authToken = socket.request.cookies.uid;

        if(!authToken){
            return next(new ErrorHandler("Please login to access this route", 401));
        }

        const decodedData = await jwt.verify(authToken, process.env.JWT_SECRET_KEY);

        const user = await userModel.findById(decodedData.id)

        if(!user){
            return next(new ErrorHandler("Please login to access this route", 401));
        }

        socket.user = user;

        return next();
    }
    catch(error){
        // console.log(error);
        return next(new ErrorHandler("Please login to access this route", 401));
    }
};

module.exports = {socketAuthenticator};