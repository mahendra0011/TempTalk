import mongoose from "mongoose";

let mongoReady = false;

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.log("MongoDB URI not set. Using temporary in-memory storage.");
    return false;
  }

  try {
    await mongoose.connect(uri);
    mongoReady = true;
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
