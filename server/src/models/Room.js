import mongoose from "mongoose";

const roomUserSchema = new mongoose.Schema(
  {
    socketId: String,
    username: String,
    joinedAt: Date
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    users: {
      type: [roomUserSchema],
      default: []
    },
    active: {
      type: Boolean,
      default: true
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

export default mongoose.model("Room", roomSchema);
