import { Router } from "express";
import { createRoomHandler, getRoomHandler } from "../controllers/roomController.js";

const router = Router();

router.post("/create", createRoomHandler);
router.get("/:roomId", getRoomHandler);

export default router;
