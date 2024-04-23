const express = require('express');
const router = express.Router();

const {signupHandler, loginHandler, isLoggedIn, otpVerification, resendOtp, isAuthorized, deleteAccount, logoutHandler} = require('../Controllers/auth');

const { registerValidator, validateHandler, loginValidator, otpVerificationValidator, resendOtpValidator, isLoggedInValidator } = require('../Utils/validators');
const { upload } = require('../Utils/helpers');

router.post('/signup', upload.single('profilePic'), registerValidator(), validateHandler, signupHandler);

router.post('/otp-verification', otpVerificationValidator(), validateHandler, otpVerification);

router.post('/resend-otp', resendOtpValidator(), validateHandler, resendOtp);

router.post('/login', loginValidator(), validateHandler, loginHandler);

router.get('/logout', logoutHandler);

// router.post('/check-is-logged-in', isLoggedInValidator(), validateHandler, isLoggedIn);
router.post('/check-is-logged-in', isLoggedIn);

router.post('/delete-account', isAuthorized, deleteAccount);

module.exports = router;