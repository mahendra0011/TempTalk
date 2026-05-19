import mongoose from "mongoose";

const reactionUserSchema = new mongoose.Schema(
  {
    username: String,
    reactedAt: Date
  },
  { _id: false }
);

const reactionSchema = new mongoose.Schema(
  {
    emoji: String,
    users: {
      type: [reactionUserSchema],
      default: []
    }
  },
  { _id: false }
);

const readReceiptSchema = new mongoose.Schema(
  {
    username: String,
    seenAt: Date
  },
  { _id: false }
);

const replySchema = new mongoose.Schema(
  {
    messageId: String,
    sender: String,
    text: String
  },
  { _id: false }
);

const attachmentSchema = new mongoose.Schema(
  {
    attachmentId: String,
    kind: String,
    name: String,
    mimeType: String,
    size: Number,
    url: String,
    storedName: String
  },
  { _id: false }
);

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
      default: "",
      maxlength: 8000
    },
    attachment: {
      type: attachmentSchema,
      default: null
    },
    replyTo: {
      type: replySchema,
      default: null
    },
    reactions: {
      type: [reactionSchema],
      default: []
    },
    readBy: {
      type: [readReceiptSchema],
      default: []
    },
    editedAt: {
      type: Date,
      default: null
    },
    deletedAt: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date,
      expires: 0,
      index: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
