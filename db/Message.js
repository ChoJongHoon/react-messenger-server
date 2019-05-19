import mongoose from "mongoose";

const Schema = mongoose.Schema;

const messageSchema = new Schema({
  senderId: String,
  receiverId: String,
  contents: String,
  time: Date
});

export default mongoose.model("Message", messageSchema);
