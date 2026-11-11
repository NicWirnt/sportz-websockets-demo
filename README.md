# Sportz

Express application with Neon Postgres and Drizzle ORM using `node-postgres` (`pg`).
Requires a current Node.js LTS release and npm. Run commands from this directory.

```powershell
npm install
```

Copy `.env.example` to `.env` if needed and set real Neon connection strings.
`DATABASE_URL` is the pooled application connection; `DATABASE_URL_UNPOOLED`
is the direct connection used by Drizzle Kit. Keep `.env` private.

```powershell
npm run db:generate
npm run db:migrate
npm run crud:demo
```

The schema is in `src/db/schema.js`; generated migrations are committed in `drizzle/`.
The demo inserts a uniquely named demo user, verifies reads and updates, deletes
that same user, verifies deletion, and closes the pool. It also attempts cleanup
if an intermediate operation fails. It can be run repeatedly.

```powershell
npm start
```

The Express server listens at http://localhost:8000/.
