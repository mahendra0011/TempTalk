import { z } from "zod";

// Room ID validation - must be 4-24 alphanumeric chars, dashes, underscores
export const roomIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{4,24}$/, "Invalid room ID format");

// Secret key validation - max 64 chars
export const secretSchema = z.string().max(64, "Secret key too long").optional();

// Username validation - max 24 chars
export const usernameSchema = z.string().max(24, "Username too long").optional();

// Message text validation
export const textSchema = z.string().max(8000, "Message too long").optional();

// Room creation validation
export const createRoomSchema = z.object({
  roomId: roomIdSchema.optional(),
  mode: z.enum(["private", "group"]).optional(),
  secret: secretSchema,
  maxPeers: z.number().int().min(2).max(100).optional()
});

// Validate room ID from params
export function validateRoomId(req, res, next) {
  const result = roomIdSchema.safeParse(req.params.roomId);
  if (!result.success) {
    return res.status(400).json({ message: result.error.errors[0].message });
  }
  next();
}

// Validate room creation body
export function validateCreateRoom(req, res, next) {
  const result = createRoomSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: result.error.errors[0].message });
  }
  // Attach validated data to request
  req.validatedBody = result.data;
  next();
}