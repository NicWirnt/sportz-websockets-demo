import { desc, eq } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/db.js";
import { commentary } from "../db/schema.js";
import {
  createCommentarySchema,
  listCommentaryQuerySchema,
} from "../validation/commentary.js";
import { matchIdParamSchema } from "../validation/matches.js";

export const commentaryRouter = Router({ mergeParams: true });

const MAX_LIMIT = 100;

commentaryRouter.get("/", async (req, res) => {
  const params = matchIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({
      error: "Invalid Match ID",
      details: params.error.issues,
    });
  }

  const query = listCommentaryQuerySchema.safeParse(req.query);
  if (!query.success) {
    return res.status(400).json({
      error: "Invalid Query Parameters",
      details: query.error.issues,
    });
  }

  const limit = Math.min(query.data.limit ?? MAX_LIMIT, MAX_LIMIT);

  try {
    const data = await db
      .select()
      .from(commentary)
      .where(eq(commentary.matchId, params.data.id))
      .orderBy(desc(commentary.createdAt))
      .limit(limit);

    return res.json({ data });
  } catch {
    return res.status(500).json({ error: "Failed to fetch commentary." });
  }
});

commentaryRouter.post("/", async (req, res) => {
  const params = matchIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({
      error: "Invalid Match ID",
      details: params.error.issues,
    });
  }

  const body = createCommentarySchema.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({
      error: "Invalid Payload",
      details: body.error.issues,
    });
  }

  try {
    const [result] = await db
      .insert(commentary)
      .values({ ...body.data, matchId: params.data.id })
      .returning();

    if (res.app.locals.broadcastCommentary) {
      res.app.locals.broadcastCommentary(result.matchId, result);
    }

    return res.status(201).json({ data: result });
  } catch (error) {
    const code = error.cause?.code;
    if (code === "23503") {
      return res.status(404).json({ error: "Match not found." });
    }
    if (code === "23505") {
      return res.status(409).json({
        error: "Commentary with this sequence already exists for this match.",
      });
    }

    return res.status(500).json({ error: "Failed to create commentary." });
  }
});
