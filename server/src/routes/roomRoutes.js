import { Router } from "express";
import { createRoomHandler, getRoomHandler } from "../controllers/roomController.js";
import { validateCreateRoom, validateRoomId } from "../middleware/validation.js";

const router = Router();

router.post("/create", validateCreateRoom, createRoomHandler);
router.get("/:roomId", validateRoomId, getRoomHandler);

export default router;