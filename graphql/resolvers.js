import { PubSub, withFilter } from "graphql-yoga";
import { GraphQLScalarType } from "graphql";
import { Kind } from "graphql/language";
import User from "../db/User";
import Message from "../db/Message";

const pubsub = new PubSub();
const NEW_USER = "NEW_USER";
const NEW_MESSAGE = "NEW_MESSAGE";
let rooms = [];

User.find()
  .sort({ _id: 1 })
  .then(users => {
    let usersArray = [];
    users.forEach(u => {
      usersArray.push(u._id);
    });
    for (let i = 0; i < usersArray.length; i++) {
      for (let j = i + 1; j < usersArray.length; j++) {
        rooms.push(usersArray[i] + usersArray[j]);
      }
    }
  });

const resolvers = {
  Query: {
    users: () => {
      return User.find().sort({ name: 1 });
    },
    user: (_, { _id }) => {
      return User.findOne({ _id });
    },
    messages: (_, { userId1, userId2 }) => {
      return Message.find({
        $or: [
          { $and: [{ senderId: userId1 }, { receiverId: userId2 }] },
          { $and: [{ senderId: userId2 }, { receiverId: userId1 }] }
        ]
      }).sort({ time: 1 });
    }
  },
  Mutation: {
    addUser: async (_, { _id, name, imageUrl }) => {
      let newUser = new User({
        _id: _id,
        name,
        imageUrl,
        online: true
      });

      pubsub.publish(NEW_USER, {
        newUser
      });

      return await newUser.save();
    },
    sendMessage: async (_, { senderId, receiverId, contents, time }) => {
      let newMessage = new Message({
        senderId,
        receiverId,
        contents,
        time
      });
      pubsub.publish(NEW_MESSAGE, {
        roomId:
          senderId < receiverId ? senderId + receiverId : receiverId + senderId,
        newMessage
      });

      return await newMessage.save();
    }
  },
  Subscription: {
    newUser: {
      subscribe: () => pubsub.asyncIterator(NEW_USER)
    },
    newMessage: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(NEW_MESSAGE),
        (payload, args) => payload.roomId === args.roomId
      )
    }
  },
  Date: new GraphQLScalarType({
    name: "Date",
    description: "Date custom scalar type",
    parseValue(value) {
      return new Date(value); // value from the client
    },
    serialize(value) {
      return value.getTime(); // value sent to the client
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.INT) {
        return new Date(ast.value); // ast value is always in string format
      }
      return null;
    }
  })
};

export default resolvers;
