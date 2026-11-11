import { z } from "zod";

export const MATCH_STATUS = {
  SCHEDULED: "scheduled",
  LIVE: "live",
  FINISHED: "finished",
};

export const listMatchesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const matchIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const isoDateTimeSchema = z.iso.datetime({ offset: true });
const validIsoDateString = z.string().refine(
  (value) =>
    isoDateTimeSchema.safeParse(value).success &&
    Number.isFinite(Date.parse(value)),
  { message: "Must be a valid ISO date string with a timezone" },
);

export const createMatchSchema = z
  .object({
    sport: z.string().trim().min(1),
    homeTeam: z.string().trim().min(1),
    awayTeam: z.string().trim().min(1),
    startTime: validIsoDateString,
    endTime: validIsoDateString,
    homeScore: z.coerce.number().int().nonnegative().optional(),
    awayScore: z.coerce.number().int().nonnegative().optional(),
  })
  .superRefine((match, context) => {
    const startTime = Date.parse(match.startTime);
    const endTime = Date.parse(match.endTime);

    if (
      Number.isFinite(startTime) &&
      Number.isFinite(endTime) &&
      endTime <= startTime
    ) {
      context.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "endTime must be after startTime",
      });
    }
  });

export const updateScoreSchema = z.object({
  homeScore: z.coerce.number().int().nonnegative(),
  awayScore: z.coerce.number().int().nonnegative(),
});
