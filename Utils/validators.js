const expressValidator = require('express-validator');
const {body, param, validationResult} = expressValidator;

const registerValidator = ()=>[
    body("firstname", "First name field should not be empty").notEmpty().isAlpha().withMessage("First name field should only contain alphabets"),
    body("password", "Password field should not be empty").notEmpty().isLength({min: 5}).withMessage("Password field should be atleast 5 characters long"),
    body("email", "Email address field should not be empty").notEmpty().isEmail().withMessage("Email address field is not valid")
]

const loginValidator = ()=>[
    body("email", "Email address field should not be empty").notEmpty().isEmail().withMessage("Email address field is not valid"),
    body("password", "Password field should not be empty").notEmpty().isLength({min: 5}).withMessage("Password field should be atleast 5 characters long")
]

const createGroupValidator = ()=>[
    body("groupName", "Group name field should not be empty").notEmpty(),
    body("member_ids", "Members field should not be empty").notEmpty().isArray().withMessage("Members field should be an array").isLength({min: 2, max: 100}).withMessage("Members field length should be between 2-100")
]

const deleteGroupValidator = ()=>[
    body("group_id", "Group id field should not be empty").notEmpty()
]

const addPersonsInTheGroupValidator = ()=>[
    body("groupId", "Group id field should not be empty").notEmpty(),
    body("personsToBeAddedIds", "Persons to be added field should not be empty").notEmpty().isArray().withMessage("Persons to be added field should be an array").isLength({min: 2, max: 97}).withMessage("Persons to be added field length should be between 2-100")
]

const removePersonFromTheGroupGroupValidator = ()=>[
    body("groupId", "Group id field should not be empty").notEmpty(),
    body("personToBeRemovedId", "Person to be removed field should not be empty").notEmpty()
]

const leaveGroupValidator = ()=>[
    body("groupId", "Group id field should not be empty").notEmpty()
]

const addPersonValidator = ()=>[
    body("personToBeAdded", "Person to be added field should not be empty").notEmpty()
]

const acceptAndRejectRequestValidator = ()=>[
    body("requestSenderId", "Request sender id field should not be empty").notEmpty()
]

const searchUserValidator = ()=>[
    param("key", "Key field should not be empty").notEmpty()
]

const sendRequestValidator = ()=>[
    body("personToWhichRequestSentId", "Person to which request sent field should not be empty").notEmpty()
]

const acceptRequestValidator = ()=>[
    body("requestId", "Request id field should not be empty").notEmpty()
]

const rejectRequestValidator = ()=>[
    body("requestId", "Request id field should not be empty").notEmpty()
]

const sendMessageValidator = ()=>[
    body("chat_id", "Chat id field should not be empty").notEmpty(),
    body("content", "Content field should not be empty").notEmpty()
]

const deleteMessageValidator = ()=>[
    body("chat_id", "Chat id field should not be empty").notEmpty(),
    body("msg_id", "Message id field should not be empty").notEmpty()
]

const sendAttachmentValidator = ()=>[
    body("chat_id", "Chat id field should not be empty").notEmpty(),
    body("user_id", "User id field should not be empty").notEmpty()
]

const getMessagesValidator = ()=>[
    body("chat_id", "Chat id field should not be empty").notEmpty()
]

const otpVerificationValidator = ()=>[
    body("email", "Chat id field should not be empty").notEmpty().isEmail().withMessage("Email address field is not valid"),
    body("otp", "Otp field should not be empty").notEmpty().isLength({min:4, max: 4}).withMessage("Otp field should be 4 digits long")
]

const resendOtpValidator = ()=>[
    body("email", "Chat id field should not be empty").notEmpty().isEmail().withMessage("Email address field is not valid")
]

const isLoggedInValidator = ()=>[
    body("uid", "uid field should not be empty").notEmpty()
]

const unfriendValidator = ()=>[
    body("another_user_id", "another user id field should not be empty").notEmpty()
]

const getMyAvailableFriendsValidator = ()=>[
    body("group_id", "group id field should not be empty").notEmpty()
]

const getUserDetailsValidator = ()=>[
    body("user_id", "user id field should not be empty").notEmpty()
]

const getGroupDetailsValidator = ()=>[
    body("chat_id", "chat id field should not be empty").notEmpty()
]


const validateHandler = (req, res, next)=>{
    const {errors} = validationResult(req);

    if(errors.length === 0){
        return next();
    }

    const errorMsg = errors.map(err=>err.msg).join(", ");
    res.status(400).json({
        status: 400,
        msg: errorMsg
    })
}

module.exports = {registerValidator, loginValidator, validateHandler, createGroupValidator, deleteGroupValidator, addPersonsInTheGroupValidator, removePersonFromTheGroupGroupValidator, leaveGroupValidator, addPersonValidator, acceptAndRejectRequestValidator, searchUserValidator, sendRequestValidator, acceptRequestValidator, rejectRequestValidator, sendMessageValidator, deleteMessageValidator, sendAttachmentValidator, getMessagesValidator, otpVerificationValidator, resendOtpValidator, isLoggedInValidator, unfriendValidator, getMyAvailableFriendsValidator, getUserDetailsValidator, getGroupDetailsValidator}