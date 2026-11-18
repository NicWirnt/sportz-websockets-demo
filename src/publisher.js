import { createHash, timingSafeEqual } from "node:crypto";

const digest = (value) => createHash("sha256").update(value).digest();

export function publisherOnly(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const key = process.env.PUBLISH_TOKEN;
  if (!key) return res.status(503).json({ error: "Publishing is disabled." });
  if (
    !timingSafeEqual(
      digest(req.get("authorization") ?? ""),
      digest("Bearer " + key),
    )
  ) {
    return res.status(401).json({ error: "Publisher token required." });
  }
  next();
}
