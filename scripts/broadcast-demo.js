import "dotenv/config";
import { setTimeout as delay } from "node:timers/promises";

const base =
  process.env.API_URL || "http://127.0.0.1:" + (process.env.PORT || 8000);
if (!process.env.PUBLISH_TOKEN)
  throw new Error("Set PUBLISH_TOKEN to publish.");
async function publish(method, path, payload) {
  const response = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + process.env.PUBLISH_TOKEN,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok)
    throw new Error(method + " " + path + " returned " + response.status);
  return (await response.json()).data;
}
const now = Date.now();
const match = await publish("POST", "/matches", {
  sport: "Football",
  homeTeam: "Northbridge FC",
  awayTeam: "Atlas United",
  startTime: new Date(now).toISOString(),
  endTime: new Date(now + 90 * 60000).toISOString(),
});
console.log(
  "Demo match #" + match.id + " is on air. Open the match in two browsers.",
);
for (const [index, message] of [
  "Kick-off at Northbridge. Atlas take the first touch.",
  "Northbridge win a corner after a quick break down the right.",
  "Goal for Northbridge! A near-post header opens the scoring.",
].entries()) {
  await delay(6000);
  if (index === 2)
    await publish("PATCH", "/matches/" + match.id + "/score", {
      homeScore: 1,
      awayScore: 0,
    });
  await publish("POST", "/matches/" + match.id + "/commentary", {
    sequence: index + 1,
    minute: index + 1,
    message,
    eventType: ["Kick-off", "Corner", "Goal"][index],
  });
  console.log(message);
}
