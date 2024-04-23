const userModel = require("../Models/user");
const chatModel = require("../Models/chat");
const messageModel = require("../Models/message");
const { TryCatch } = require("../Utils/error");
const { REFETCH_CHATS, REFETCH_MEMBERS } = require("../constants/events");
const { emitEvent } = require("../Utils/socketHelpers");
const requestModel = require("../Models/request");

// TODO : NOT WORKING PROPERLY
const searchUser = TryCatch(async (req, res) => {
    const { key: query = "" } = req.params;

    // Finding it all my chats
    const myChats = await chatModel.find({ is_group_chat: false, participants: req.user.id });

    // Extracting all users from my chat means friends or people I have chatted with
    const allUsersFromMyChats = myChats.map(chat => chat.participants).flat();

    // Finding all users except me and my friends
    const allUsersExceptMeAndFriends = await userModel.find({
        _id: { $nin: allUsersFromMyChats },
        first_name: { $regex: query, $options: "i" }
    })

    const users = allUsersExceptMeAndFriends.map(({ _id, first_name, last_name, profilePic }) => ({ _id, first_name, last_name, profilePic: profilePic.url }))

    // const regex = new RegExp('^'+query, "i")

    // const result = await userModel.find({
    //     $or: [
    //         {first_name: regex},
    //         {last_name: regex},
    //         {email: regex}
    //     ]
    // })

    res.status(200).json({
        status: 200,
        users: users
    });
})

const unfriend = TryCatch(async (req, res) => {
    const user_id = req.user.id;
    const another_user_id = req.body.another_user_id;

    const user = await userModel.findById(user_id);
    const another_user = await userModel.findById(another_user_id);
    const chat = await chatModel.findOne({ is_group_chat: false, participants: { $all: [user._id, another_user._id] } })

    if (!chat) {
        return res.status(404).json({
            status: 404,
            msg: "Chat not found"
        })
    }

    await messageModel.deleteMany({ chat: chat._id });
    await chatModel.deleteOne({_id: chat._id});
    await requestModel.deleteOne({$or: [
        {sender: user._id, receiver: another_user._id},
        {receiver: user._id, sender: another_user._id}
    ]})
    emitEvent(req, REFETCH_CHATS, [{ _id: another_user._id }, { _id: user._id }]);

    res.status(200).json({
        status: 200,
        msg: `You have unfriended ${another_user.first_name} ${another_user.last_name}`
    })
})

const userData = TryCatch(async (req, res) => {
    const user_email = req.user.email;

    const user = await userModel.findOne({ email: user_email });

    res.status(200).json({
        status: 200,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        requests: user.requests,
        requested: user.requested,
        profilePic: user?.profilePic.url
    })
})

const createGroup = TryCatch(async (req, res) => {
    const { groupName, member_ids } = req.body;
    const user_id = req.user.id;

    const user = await userModel.findOne({ _id: user_id });
    const membersPromise = [];

    for (member_id of member_ids) {
        const member = await userModel.findOne({ _id: member_id })
        if (member === null) {
            continue;
        }
        membersPromise.push(member._id);
    }

    await Promise.all(membersPromise);
    membersPromise.push(user._id);

    if (member_ids === undefined || member_ids.length < 2) {
        res.status(400);
        return res.status(400).json({
            status: 400,
            msg: 'In a group there must be atleast 3 members'
        });
    }

    const createdGroup = await chatModel.create({
        chatName: groupName,
        group_admin: user._id,
        is_group_chat: true,
        participants: membersPromise,
        groupProfilePic: { id: req.file.filename, url: req.file.path }
    })

    // TODO
    // Notify all the members that they have been added to the group
    emitEvent(req, REFETCH_CHATS, membersPromise);

    res.status(200).json({
        status: 200,
        msg: "Group has been created"
    })
})

const deleteGroup = TryCatch(async (req, res) => {
    const { group_id } = req.body;
    const user_id = req.user.id;

    const group = await chatModel.findOne({ _id: group_id });
    const existingUser = await userModel.findOne({ _id: user_id });

    if (existingUser === null) {
        return res.status(401).json({
            status: 401,
            msg: "User doesn't exist"
        });
    }
    if (group === null) {
        return res.status(401).json({
            status: 401,
            msg: "Group doesn't exist"
        });
    }
    if (group.is_group_chat === false) {
        return res.status(401).json({
            status: 401,
            msg: "This is not a group chat"
        });
    }
    if (existingUser._id.toString() !== group.group_admin.toString()) {
        return res.status(401).json({
            status: 401,
            msg: "Only group admins can delete the group"
        });
    }

    const groupParticipants = [];
    for(let participant of group.participants){
        groupParticipants.push({_id: participant});
    }

    await messageModel.deleteMany({ chat: group._id });
    await chatModel.deleteOne({_id: group._id});
    emitEvent(req, REFETCH_CHATS, groupParticipants);

    res.status(200).json({
        status: 200,
        msg: "Group has been deleted successfully"
    })
})

const addPersonsInTheGroup = TryCatch(async (req, res) => {
    const user_id = req.user.id;
    const { personsToBeAddedIds, groupId } = req.body;

    const user = await userModel.findOne({ _id: user_id });

    const group = await chatModel.findOne({ _id: groupId });
    if (group === null) {
        return res.status(401).json({
            status: 401,
            msg: "Group doesn't exist"
        });
    }

    const personsToBeAddedPromise = [];

    for (personToBeAddedId of personsToBeAddedIds) {
        const person = await userModel.findById(personToBeAddedId);
        personsToBeAddedPromise.push(person._id);
    }
    const allNewMembers = await Promise.all(personsToBeAddedPromise);

    const uniquePersons = allNewMembers.filter(person => !group.participants.includes(person.toString()));

    if (user._id.toString() !== group.group_admin.toString()) {
        return res.status(401).json({
            status: 401,
            msg: "Only admins can add a person in the group"
        });
    }
    if (uniquePersons.length === 0) {
        return res.status(401).json({
            status: 401,
            msg: "No new users to add in the group"
        });
    }
    if (group.participants.length >= 100 || group.participants.length + uniquePersons.length > 100) {
        return res.status(403).json({
            status: 401,
            msg: "Group can only have maximum 100 members"
        });
    }

    const uniquePersonsIds = [];
    for (person of uniquePersons) {
        uniquePersonsIds.push({ _id: person });
    }
    group.participants.push(...uniquePersons);
    await group.save();
    emitEvent(req, REFETCH_CHATS, uniquePersonsIds);
    emitEvent(req, REFETCH_MEMBERS, uniquePersonsIds);


    res.status(200).json({
        status: 200,
        msg: "The person/persons has been added to the group"
    })
})

const removePersonFromTheGroup = TryCatch(async (req, res) => {
    const user_id = req.user.id;
    const { personToBeRemovedId, groupId } = req.body;

    const user = await userModel.findById(user_id);
    const personToBeRemoved = await userModel.findById(personToBeRemovedId);
    const group = await chatModel.findById(groupId);

    if (group === null) {
        return res.status(401).json({
            status: 401,
            msg: "Group doesn't exist"
        });
    }
    if (user._id.toString() !== group.group_admin.toString()) {
        return res.status(401).json({
            status: 401,
            msg: "Only admins can remove a person from the group"
        });
    }
    if (personToBeRemoved === null) {
        return res.status(401).json({
            status: 401,
            msg: "User doesn't exist"
        });
    }
    if (group.participants.length <= 3) {
        return res.status(403).json({
            status: 401,
            msg: "Group must have atleast 3 members"
        });
    }

    group.participants = group.participants.filter(participant => participant.toString() !== personToBeRemoved._id.toString());

    const participantsAfterRemoval = [];
    for (const participant of group.participants) {
        participantsAfterRemoval.push({ _id: participant });
    }

    await group.save();

    emitEvent(req, REFETCH_MEMBERS, participantsAfterRemoval);

    res.status(200).json({
        status: 200,
        msg: `${personToBeRemoved.first_name + ' ' + personToBeRemoved.last_name} has been removed from the group`
    })
})

const leaveGroup = TryCatch(async (req, res) => {
    const user_id = req.user.id;
    const group_id = req.body.groupId;

    const group = await chatModel.findById(group_id);

    if (group === null) {
        return res.status(401).json({
            status: 401,
            msg: "Group doesn't exist"
        });
    }
    if (user_id.toString() === group.group_admin.toString()) {
        // Make the first participant admin
        if (group.participants.length > 1) {
            let new_admin;

            for (let participant of group.participants) {
                if (participant.toString() !== user._id.toString()) {
                    new_admin = participant;
                    break;
                }
            }
            group.group_admin = new_admin;
        }
        // If there are no more participants, delete the group
        else {
            await messageModel.deleteMany({ chat: groupId, group_admin: user_id });
            await chatModel.deleteOne(group_id);

            return res.status(200).json({
                status: 200,
                msg: "Group deleted successfully, as you were the only member"
            })
        }
    }

    const remainingMembers = group.participants.filter(participant => participant.toString() !== user_id);

    if (group.group_admin.toString() === user_id) {
        group.group_admin = remainingMembers[0];
    }

    const participantsBeforeLeaving = [];
    for (participant of group.participants) {
        participantsBeforeLeaving.push({ _id: participant });
    }
    group.participants = group.participants.filter(participant => participant.toString() !== user_id.toString());
    await group.save();

    emitEvent(req, REFETCH_CHATS, participantsBeforeLeaving);
    emitEvent(req, REFETCH_MEMBERS, participantsBeforeLeaving);


    res.status(200).json({
        status: 200,
        msg: "You left the group"
    })
})

const myChatsAndGroups = TryCatch(async (req, res) => {
    const user_id = req.user.id;

    const chats = await chatModel.find({ participants: user_id }).select("_id is_group_chat groupProfilePic participants chatName group_admin").populate([{ path: "participants", select: "_id first_name last_name email profilePic updatedAt" }, { path: "latestMessage", select: "_id message attachment" }]).sort({ updatedAt: -1 });

    const transformedChats = [];
    chats.forEach(chat => {
        chat.participants = chat.participants.filter(participant => participant._id.toString() !== req.user.id.toString());
        transformedChats.push(chat);
    });
    console.log(transformedChats);

    res.status(200).json({
        status: 200,
        chats: [...transformedChats]
    })
})

const getMyFriends = TryCatch(async (req, res) => {
    const user_id = req.user.id;

    const myFriendsIncludingMe = await chatModel.find({ is_group_chat: false, participants: user_id }).select('participants -_id').populate('participants', 'first_name last_name profilePic');

    const myFriendsIncludingMeArray = myFriendsIncludingMe.map(({ participants }) => {
        return [...participants];
    }).flat();

    const myFriendsExcludingMeArray = myFriendsIncludingMeArray.filter(({ _id }) => _id.toString() !== user_id.toString());

    res.status(200).json({
        status: 200,
        friends: myFriendsExcludingMeArray
    })
})

const getMyAvailableFriendsToAddInTheGroup = TryCatch(async (req, res) => {
    const user_id = req.user.id;
    const group_id = req.body.groupId;

    const chat = await chatModel.findById(group_id);

    if (!chat || !chat.is_group_chat) {
        return res.status(404).json({
            status: 404,
            msg: "Group doesn't exist"
        })
    }
    if (chat.group_admin.toString() !== user_id.toString()) {
        return res.status(401).json({
            status: 401,
            msg: "You don't have admin rights to add members in the group"
        })
    }

    const groupMembers = chat.participants;

    const myFriendsIncludingMe = await chatModel.find({ is_group_chat: false, participants: user_id }).select('participants -_id').populate('participants', 'first_name last_name profilePic');

    const myFriendsIncludingMeArray = myFriendsIncludingMe.map(({ participants }) => {
        return [...participants];
    }).flat();

    const myFriendsExcludingMeArray = myFriendsIncludingMeArray.filter(({ _id }) => _id.toString() !== user_id.toString());

    const remainingFriends = [];

    for (const friend of myFriendsExcludingMeArray) {
        if (!groupMembers.includes(friend._id)) {
            remainingFriends.push(friend);
        }
    }

    res.status(200).json({
        status: 200,
        availableFriends: [...remainingFriends]
    })
})

const getUserDetails = TryCatch(async (req, res) => {
    const user_id = req.body.user_id;

    const userData = await userModel.findOne({ _id: user_id });

    res.status(200).json({
        status: 200,
        userDetails: {
            _id: userData._id,
            first_name: userData.first_name,
            last_name: userData.last_name,
            profilePic: userData.profilePic.url,
            email: userData.email,
            joined: userData.createdAt
        }
    })
})

const getGroupDetails = TryCatch(async (req, res) => {
    const chat_id = req.body.chat_id;
    const user_id = req.user.id;

    const chatData = await chatModel.findById(chat_id).populate("participants", "_id first_name last_name profilePic.url");

    if (!chatData || !chatData.is_group_chat) {
        return res.status(404).json({
            status: 404,
            msg: "Group doesn't exist"
        })
    }

    if (!chatData || !chatData.is_group_chat) {
        return res.status(404).json({
            status: 404,
            msg: "Group doesn't exist"
        })
    }

    const userData = await userModel.findById(user_id);

    const isMember = chatData.participants.findIndex(participant => participant._id.toString() === userData._id.toString());

    if (isMember === -1) {
        return res.status(401).json({
            status: 401,
            msg: "You must be member of the group to access group's information"
        })
    }

    res.status(200).json({
        status: 200,
        groupDetails: {
            _id: chatData._id,
            groupName: chatData.chatName,
            groupProfilePic: chatData.groupProfilePic.url,
            groupAdmin: chatData.group_admin,
            participants: chatData.participants,
            joined: chatData.createdAt
        }
    })
})

module.exports = { searchUser, unfriend, userData, createGroup, deleteGroup, addPersonsInTheGroup, removePersonFromTheGroup, leaveGroup, myChatsAndGroups, getMyFriends, getMyAvailableFriendsToAddInTheGroup, getUserDetails, getGroupDetails };