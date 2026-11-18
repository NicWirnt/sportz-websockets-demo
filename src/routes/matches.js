import { Router } from "express";
import {
  createMatchSchema,
  updateScoreSchema,
  matchIdParamSchema,
  listMatchesQuerySchema,
} from "../validation/matches.js";
import { matches } from "../db/schema.js";
import { db } from "../db/db.js";
import { getMatchStatus } from "../utils/match-status.js";
import { desc, eq } from "drizzle-orm";

export const matchRouter = Router();

const MAX_LIMIT = 100;

matchRouter.get("/", async (req, res) => {
  const parsed = listMatchesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid Query Parameters",
      details: parsed.error.issues,
    });
  }
  const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);

  try {
    const data = await db
      .select()
      .from(matches)
      .orderBy(desc(matches.createdAt))
      .limit(limit);

    res.json({
      data: data.map((match) => ({
        ...match,
        status: match.endTime
          ? getMatchStatus(match.startTime, match.endTime)
          : match.status,
      })),
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch matches.",
    });
  }
});

matchRouter.post("/", async (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid Payload",
      details: parsed.error.issues,
    });
  }
  const { startTime, endTime, homeScore, awayScore } = parsed.data;
  try {
    const [event] = await db
      .insert(matches)
      .values({
        ...parsed.data,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        homeScore: homeScore ?? 0,
        awayScore: awayScore ?? 0,
        status: getMatchStatus(startTime, endTime),
      })
      .returning();

    if (res.app.locals.broadcastMatchCreated) {
      res.app.locals.broadcastMatchCreated(event);
    }

    res.status(201).json({
      data: event,
    });
  } catch (e) {
    res.status(500).json({
      error: "Failed to create match.",
    });
  }
});

matchRouter.patch("/:id/score", async (req, res) => {
  const params = matchIdParamSchema.safeParse(req.params);
  const body = updateScoreSchema.safeParse(req.body);
  if (!params.success || !body.success) {
    return res.status(400).json({ error: "Invalid match ID or score." });
  }
  const [match] = await db
    .update(matches)
    .set(body.data)
    .where(eq(matches.id, params.data.id))
    .returning();
  if (!match) return res.status(404).json({ error: "Match not found." });
  res.app.locals.broadcastScore(match);
  res.json({ data: match });
});
