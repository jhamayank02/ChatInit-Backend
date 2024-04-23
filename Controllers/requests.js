const userModel = require("../Models/user");
const requestModel = require("../Models/request");
const {TryCatch} = require("../Utils/error");
const chatModel = require("../Models/chat");
const { emitEvent } = require("../Utils/socketHelpers");
const { NEW_REQUEST, REFETCH_CHATS, REFETCH_REQUESTS } = require("../constants/events");

const sendRequest = TryCatch(async (req, res)=>{
    const user_id = req.user.id;
    const personToWhichRequestSentId = req.body.personToWhichRequestSentId;

    const personToWhichRequestSent = await userModel.findById(personToWhichRequestSentId);

    if(personToWhichRequestSent === null){
        return res.status(401).json({
            status: 401,
            msg: "User doesn't exist"
        })
    }
    if(personToWhichRequestSent._id.toString() === user_id){
        return res.status(401).json({
            status: 401,
            msg: "You cannot send request to yourself"
        })
    }

    const request = await requestModel.findOne({
        $or: [
            {sender: user_id, receiver: personToWhichRequestSentId},
            {sender: personToWhichRequestSentId, receiver: user_id},
        ]
    })

    if(request !== null){
        return res.status(401).json({
            status: 401,
            msg: "Request already sent"
        })
    }

    const newRequest = await requestModel.create({
        sender: user_id,
        receiver: personToWhichRequestSent._id,
        status: "Pending"
    })

    const requestReceiver = [{_id: personToWhichRequestSent._id}];
    emitEvent(req, NEW_REQUEST, requestReceiver);
    emitEvent(req, REFETCH_REQUESTS, requestReceiver);

    res.status(200).json({
        status: 200,
        msg: "Your request has been sent"
    })
})

const acceptRequest = TryCatch(async (req, res)=>{
    const requestId = req.body.requestId;

    const request = await requestModel.findById(requestId);
    const sender = await userModel.findById(request.sender);

    if(request === null){
        return res.status(401).json({
            status: 401,
            msg: "Request not found"
        })
    }
    if(request.receiver.toString() !== req.user.id){
        return res.status(401).json({
            status: 401,
            msg: "You are not allowed to perform this operation"
        })
    }
    if(request.status === 'Rejected'){
        return res.status(401).json({
            status: 401,
            msg: "The request has already been rejected"
        })
    }

    request.status = "Accepted";
    await request.save();

    const newChat = await chatModel.create({participants: [request.sender, request.receiver]})
    emitEvent(req, REFETCH_CHATS, [{_id: request.sender}, {_id: request.receiver}]);
    emitEvent(req, REFETCH_REQUESTS, [{_id: request.receiver}]);

    res.status(200).json({
        status: 200,
        msg: `Your accepted ${sender.first_name} ${sender.last_name}'s request`
    })
})

const rejectRequest = TryCatch(async (req, res)=>{
    const requestId = req.body.requestId;

    const request = await requestModel.findById(requestId);
    const requestSentBy = await userModel.findById(request.sender.toString());

    if(request === null){
        return res.status(401).json({
            status: 401,
            msg: "Request not found"
        })
    }
    
    if(request.receiver.toString() !== req.user.id){
        return res.status(401).json({
            status: 401,
            msg: "You are not allowed to perform this operation"
        })
    }

    request.status = "Rejected";
    await request.save();

    emitEvent(req, REFETCH_REQUESTS, [{_id: request.receiver}]);

    res.status(200).json({
        status: 200,
        msg: `You rejected ${requestSentBy.first_name + ' ' + requestSentBy.last_name}'s request`
    })
})

const requestsSentByMe = TryCatch(async (req, res)=>{
    const user_id = req.user.id;

    const requests = await requestModel.find({sender: user_id}).select("_id receiver status createdAt").populate("receiver", "first_name last_name profilePic");

    const transformedRequests = requests.filter(request => request.status !== "Rejected");

    res.status(200).json({
        status: 200,
        requests
    })
})

const requestsReceivedByMe = TryCatch(async (req, res)=>{
    const user_id = req.user.id;

    const requests = await requestModel.find({receiver: user_id}).select("_id sender status createdAt").populate("sender", "first_name last_name profilePic");

    const transformedRequests = requests.filter(request => request.status === "Pending");

    res.status(200).json({
        status: 200,
        requests: [...transformedRequests]
    })
})

module.exports = {sendRequest, acceptRequest, rejectRequest, requestsSentByMe, requestsReceivedByMe};