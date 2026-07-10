import mongoose from "mongoose";

let mongoReady = false;
let mongoConfigured = false;
let reconnectionAttempts = 0;
const maxReconnectionAttempts = 5;

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.log("MongoDB URI not set. Using temporary in-memory storage.");
    mongoReady = false;
    mongoConfigured = false;
    return false;
  }

  mongoConfigured = true;

  try {
    await mongoose.connect(uri);
    mongoReady = true;
    reconnectionAttempts = 0;
    console.log("MongoDB connected.");
    return true;
  } catch (error) {
    mongoReady = false;
    console.warn(`MongoDB connection failed. Falling back to memory: ${error.message}`);
    return false;
  }
}

export function isMongoReady() {
  return mongoReady && mongoose.connection.readyState === 1;
}

export function wasMongoConfigured() {
  return mongoConfigured;
}

export function getMongoState() {
  return {
    configured: mongoConfigured,
    ready: mongoReady,
    state: mongoose.connection.readyState,
    stateName: ["disconnected", "connected", "connecting", "disconnecting"][mongoose.connection.readyState] || "unknown"
  };
}