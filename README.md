# Sportz broadcast API

Express, WebSocket and PostgreSQL power the [Sportz FM match centre](https://github.com/NicWirnt/sportz-matchday). Both ordinary PostgreSQL and Neon are supported.

**Home server setup:** [Deploy the API, frontend and PostgreSQL with Coolify](https://github.com/NicWirnt/sportz-matchday/blob/main/DEPLOYMENT.md).

## Local development

Use Node 24 LTS, npm, and a dedicated PostgreSQL database. In PowerShell:

```powershell
npm ci
Copy-Item .env.example .env -NoClobber
```

Set `DATABASE_URL` in `.env`. For Neon, use its pooled application URL and supply the direct URL in `DATABASE_URL_UNPOOLED`. For local PostgreSQL only the direct `DATABASE_URL` is needed. Set a random `PUBLISH_TOKEN` to enable writes. Arcjet protection is enabled when `ARCJET_KEY` is present.

```powershell
node src/db/migrate.js
npm start
```

Visit `http://localhost:8000/health` for readiness. For a two-viewer demo, open the frontend in two windows and run `node scripts/broadcast-demo.js` in a second backend terminal. Each run creates one fixture, three commentary updates and a score change. The publisher uses the token from its environment and defaults to the API on loopback. Override `API_URL` for a different API origin.

## API

| Method and path | Purpose |
| --- | --- |
| GET /matches?limit=50 | List recent fixtures, maximum 100 |
| POST /matches | Create a fixture with sport, homeTeam, awayTeam, startTime and endTime |
| PATCH /matches/:id/score | Set absolute homeScore and awayScore |
| GET /matches/:id/commentary?limit=100 | Read recent commentary |
| POST /matches/:id/commentary | Add a message with a sequence unique to the match and optional minute and eventType |

Write requests require `Authorization: Bearer <PUBLISH_TOKEN>` and JSON bodies. Without a configured token the API serves reads only. See [the demo publisher](scripts/broadcast-demo.js) for complete request examples.

Connect to `/ws` for global `match_created` and `score_updated` events. Send `{"type":"subscribe","matchId":1}` to receive that fixture’s `commentary` events, and `{"type":"unsubscribe","matchId":1}` when switching matches. On reconnect subscribe again and fetch the current match list and commentary via HTTP. Run one API instance for this in-memory broadcast implementation.

The Dockerfile runs migrations at startup and listens on 8000. Use a dedicated database and keep its persistent volume when redeploying.
