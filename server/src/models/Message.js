import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    messageId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    roomId: {
      type: String,
      required: true,
      index: true
    },
    sender: {
      type: String,
      required: true
    },
    text: {
      type: String,
      required: true,
      maxlength: 1000
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0,
      index: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
