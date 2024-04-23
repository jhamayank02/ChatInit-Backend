const express = require('express');
const multer = require('multer');
const { sendMessage, getMessages, sendAttachment, deleteMessage } = require('../Controllers/messages');
const { isAuthorized } = require('../Controllers/auth');
const router = express.Router();

const { storage } = require('../Utils/storage');
const { sendMessageValidator, validateHandler, sendAttachmentValidator, getMessagesValidator, deleteMessageValidator } = require('../Utils/validators');

const upload = multer({
    storage: storage
});

// router.post('/send-message', isAuthorized, sendMessageValidator(), validateHandler, sendMessage);

router.post('/delete-message', isAuthorized, deleteMessageValidator(), validateHandler, deleteMessage);

// router.post('/send-attachment', isAuthorized, upload.single('attachment'), sendAttachment);
router.post('/send-attachment', upload.single('attachment'), sendAttachmentValidator(), validateHandler, sendAttachment);

router.post('/get-messages', isAuthorized, getMessagesValidator(), validateHandler, getMessages);

module.exports = router;