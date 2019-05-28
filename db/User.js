import mongoose from "mongoose";

const Schema = mongoose.Schema;

const userSchema = new Schema({
  _id: String,
  password: String,
  name: String,
  imageUrl: String,
  online: Boolean
});

export default mongoose.model("User", userSchema);
