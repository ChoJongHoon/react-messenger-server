import mongoose from "mongoose";

const Schema = mongoose.Schema;

const todoSchema = new Schema({
  text: String,
  done: Boolean
});

export default mongoose.model("Todo", todoSchema);
