import { GraphQLServer } from "graphql-yoga";
import mongoose from "mongoose";
import resolvers from "./graphql/resolvers";

mongoose.Promise = global.Promise;

mongoose.connect("mongodb://127.0.0.1:27017/messenger", {
  useNewUrlParser: true
});

mongoose.connection.once("open", () => {
  console.log("MongoDB connect");
});

const typeDefs = "./graphql/schema.graphql";

const server = new GraphQLServer({
  typeDefs,
  resolvers,
  context: { pubsub: resolvers.pubsub }
});
server.start(() => console.log("Server is running on localhost:4000"));
