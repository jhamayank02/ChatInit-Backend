const express = require('express');
const { searchUser, userData, createGroup, deleteGroup, addPersonsInTheGroup, removePersonFromTheGroup, leaveGroup, myChatsAndGroups, getMyFriends, getUserDetails, getGroupDetails, getMyAvailableFriendsToAddInTheGroup, unfriend } = require('../Controllers/users');
const { isAuthorized } = require('../Controllers/auth');
const { createGroupValidator, validateHandler, deleteGroupValidator, addPersonsInTheGroupValidator, removePersonFromTheGroupGroupValidator, leaveGroupValidator, addPersonValidator, acceptAndRejectRequestValidator, searchUserValidator, unfriendValidator, getMyAvailableFriendsValidator, getUserDetailsValidator, getGroupDetailsValidator } = require('../Utils/validators');

const router = express.Router();

// const { registerValidator, validateHandler, loginValidator, otpVerificationValidator, resendOtpValidator, isLoggedInValidator } = require('../Utils/validators');
const { upload } = require('../Utils/helpers');

router.get('/search/:key', searchUser);

router.post('/create-group', upload.single('groupProfilePic'), createGroupValidator(), validateHandler, createGroup);

router.post('/delete-group', deleteGroupValidator(), validateHandler, deleteGroup);

router.post('/add-in-group', addPersonsInTheGroupValidator(), validateHandler, addPersonsInTheGroup);

router.post('/remove-from-group', removePersonFromTheGroupGroupValidator(), validateHandler, removePersonFromTheGroup);

router.post('/leave-group', leaveGroupValidator(), validateHandler, leaveGroup);

router.get('/my-chats', myChatsAndGroups);

router.post('/unfriend', unfriendValidator(), validateHandler, unfriend);

router.post('/user-data', userData);

router.get("/get-my-friends", getMyFriends);

router.post("/get-my-available-friends", getMyAvailableFriendsValidator(), validateHandler, getMyAvailableFriendsToAddInTheGroup);

router.post('/get-user-details', getUserDetailsValidator(), validateHandler, getUserDetails);

router.post('/get-group-details', getGroupDetailsValidator(), validateHandler, getGroupDetails);

module.exports = router;