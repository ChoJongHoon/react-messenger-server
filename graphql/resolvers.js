import { PubSub, withFilter } from "graphql-yoga";
import { GraphQLScalarType } from "graphql";
import { Kind } from "graphql/language";
import User from "../db/User";
import Message from "../db/Message";
import Todo from "../db/Todo";

const pubsub = new PubSub();
const NEW_USER = "NEW_USER";
const NEW_MESSAGE = "NEW_MESSAGE";
const NEW_TODO = "NEW_TODO";

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
    },
    todos: () => {
      return Todo.find();
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

      User.findById(_id, (err, user) => {
        if (!user) {
          return newUser.save();
        } else {
          user.online = true;
          return user.save();
        }
      });
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
    },
    addTodo: async (_, { text }) => {
      let newTodo = new Todo({
        text,
        done: true
      });

      pubsub.publish(NEW_TODO, {
        newTodo
      });

      return await newTodo.save();
    },
    removeTodo: async (_, { _id }) => {
      Todo.deleteOne({ _id }, err => {
        if (err) {
          console.error("removeTodo ERROR");
          return false;
        }
      });

      return true;
    },
    todoToggle: async (_, { _id }) => {
      return await Todo.findById(_id, (err, todo) => {
        if (err) {
          console.error("todoToggle ERROR");
        }
        if (!todo) {
          console.error("todo is not found");
        }
        todo.done = todo.done ? false : true;
        todo.save();
      });
    },
    userConnectChange: async (_, { _id, online }) => {
      return await User.findById(_id, (err, user) => {
        if (err) {
          console.error("userConnectChange ERROR");
        }
        if (!user) {
          console.error("user is not found");
        }
        user.online = online;
        user.save();
      });
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
    },
    newTodo: {
      subscribe: () => pubsub.asyncIterator(NEW_TODO)
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
