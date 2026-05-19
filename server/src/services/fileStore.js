import fs from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";

const allowedTypes = new Map([
  ["image/jpeg", { kind: "image", ext: ".jpg" }],
  ["image/png", { kind: "image", ext: ".png" }],
  ["image/webp", { kind: "image", ext: ".webp" }],
  ["image/gif", { kind: "image", ext: ".gif" }],
  ["video/mp4", { kind: "video", ext: ".mp4" }],
  ["video/webm", { kind: "video", ext: ".webm" }],
  ["video/quicktime", { kind: "video", ext: ".mov" }],
  ["audio/mpeg", { kind: "audio", ext: ".mp3" }],
  ["audio/mp4", { kind: "audio", ext: ".m4a" }],
  ["audio/wav", { kind: "audio", ext: ".wav" }],
  ["audio/webm", { kind: "audio", ext: ".webm" }],
  ["audio/ogg", { kind: "audio", ext: ".ogg" }],
  ["application/pdf", { kind: "pdf", ext: ".pdf" }]
]);

const maxAttachmentBytes = Math.max(Number(process.env.MAX_ATTACHMENT_MB || 50), 1) * 1024 * 1024;
const uploadRoot = path.resolve(process.env.UPLOAD_ROOT || path.join(process.cwd(), "uploads"));

export function getUploadRoot() {
  return uploadRoot;
}

export function getMaxAttachmentBytes() {
  return maxAttachmentBytes;
}

function isSafeUploadTarget(target) {
  const relative = path.relative(uploadRoot, target);
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function cleanName(name) {
  return String(name || "attachment")
    .replace(/[^\w.\- ]/g, "")
    .trim()
    .slice(0, 90) || "attachment";
}

function toBuffer(data) {
  if (!data) {
    return null;
  }

  if (Buffer.isBuffer(data)) {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }

  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }

  if (Array.isArray(data)) {
    return Buffer.from(data);
  }

  if (Array.isArray(data.data)) {
    return Buffer.from(data.data);
  }

  return null;
}

export async function saveAttachment({ roomId, file }) {
  const mimeType = String(file?.type || file?.mimeType || "").toLowerCase();
  const definition = allowedTypes.get(mimeType);

  if (!definition) {
    throw new Error("Only photo, video, audio, and PDF files are allowed.");
  }

  const buffer = toBuffer(file.data || file.buffer);

  if (!buffer || buffer.length === 0) {
    throw new Error("Attachment is empty.");
  }

  if (buffer.length > maxAttachmentBytes) {
    throw new Error(`Attachment must be ${Math.round(maxAttachmentBytes / 1024 / 1024)}MB or smaller.`);
  }

  const attachmentId = nanoid(12);
  const safeRoomId = String(roomId).replace(/[^\w-]/g, "");
  const roomDir = path.join(uploadRoot, safeRoomId);
  const storedName = `${attachmentId}${definition.ext}`;

  await fs.mkdir(roomDir, { recursive: true });
  await fs.writeFile(path.join(roomDir, storedName), buffer);

  return {
    attachmentId,
    kind: definition.kind,
    name: cleanName(file.name),
    mimeType,
    size: buffer.length,
    storedName,
    url: `/uploads/${safeRoomId}/${storedName}`
  };
}

export async function deleteAttachmentFile(attachment) {
  if (!attachment?.url) {
    return false;
  }

  const relative = attachment.url.replace(/^\/uploads\//, "");
  const target = path.resolve(uploadRoot, relative);

  if (!isSafeUploadTarget(target)) {
    return false;
  }

  await fs.rm(target, { force: true }).catch(() => {});
  return true;
}

export async function deleteRoomUploads(roomId) {
  const safeRoomId = String(roomId).replace(/[^\w-]/g, "");

  if (!safeRoomId) {
    return { deleted: false };
  }

  const target = path.resolve(uploadRoot, safeRoomId);

  if (!isSafeUploadTarget(target)) {
    return { deleted: false };
  }

  await fs.rm(target, { recursive: true, force: true }).catch(() => {});
  return { deleted: true };
}
