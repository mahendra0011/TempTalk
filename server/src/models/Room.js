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
    mode: {
      type: String,
      enum: ["private", "group"],
      default: "private"
    },
    maxPeers: {
      type: Number,
      default: 2
    },
    secretHash: {
      type: String,
      default: null
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
      index: true
    }
  },
  { timestamps: true }
);

// TTL index for automatic room expiration (60 second granularity)
roomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 });

export default mongoose.model("Room", roomSchema);