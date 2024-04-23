const express = require('express');
const { sendRequest, acceptRequest, rejectRequest, requestsSentByMe, requestsReceivedByMe } = require('../Controllers/requests');
const { isAuthorized } = require('../Controllers/auth');
const { sendRequestValidator, validateHandler, acceptRequestValidator, rejectRequestValidator } = require('../Utils/validators');

const router = express.Router();

router.post('/send-request', sendRequestValidator(), validateHandler, sendRequest);

router.post('/accept-request', acceptRequestValidator(), validateHandler, acceptRequest);

router.post('/reject-request', rejectRequestValidator(), validateHandler, rejectRequest);

router.get('/requests-sent-by-me', requestsSentByMe);

router.get('/requests-received-by-me', requestsReceivedByMe);

module.exports = router;