# AGENTS.md - AI Agent Instructions

This document provides context and instructions for AI coding agents (like Claude Code, Cursor, Copilot, etc.) working on this project.

## Project Overview

**Moby Dick** is a real-time whale detection dashboard for Polymarket. It monitors large trades using WebSocket connections and statistical anomaly detection.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Polymarket    │────▶│   Node.js        │────▶│   React         │
│   APIs/WS       │     │   Backend        │     │   Frontend      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │   SQLite/Prisma  │
                        │   Database       │
                        └──────────────────┘
```

### Key Components

| File | Purpose |
|------|---------|
| `src/server/index.ts` | Main server, WebSocket handling, trade processing |
| `src/server/services/websocket.ts` | Polymarket WebSocket connection |
| `src/server/services/anomaly.ts` | Z-score and percentile detection |
| `src/server/services/polymarket.ts` | REST API client for Polymarket |
| `src/server/services/database.ts` | Prisma database operations |
| `src/client/hooks/useWebSocket.ts` | Frontend real-time data hook |
| `src/client/components/WhaleTable.tsx` | Main whale activity display |

## Common Tasks

### Adding a New API Endpoint

1. Add the route in `src/server/routes/api.ts`
2. If it needs database access, add the query in `src/server/services/database.ts`
3. Export the function and import it in the routes file

### Modifying Detection Thresholds

Edit `src/server/services/anomaly.ts`:
- `isAnomaly` condition on line ~54 controls what triggers detection
- `getSeverity` method controls severity classification

### Adding a New Frontend Component

1. Create component in `src/client/components/`
2. Import and use in `Dashboard.tsx`
3. If it needs real-time data, use the `useWebSocket` hook

### Database Schema Changes

1. Edit `prisma/schema.prisma`
2. Run `npx prisma db push` (development) or `npx prisma migrate dev` (production)
3. Run `npx prisma generate` to update the client

## Code Conventions

- **TypeScript** - All code is TypeScript, maintain type safety
- **ESM** - Project uses ES modules (`"type": "module"`)
- **Tailwind** - Use Tailwind CSS classes for styling
- **Mobile-first** - Use responsive classes (`md:`, `lg:`) for larger screens

## Important Files to Read First

When starting work on this project, read these files in order:

1. `POLYMARKET_WHALE_DETECTOR_INSTRUCTIONS.md` - Detailed API documentation
2. `src/server/index.ts` - Understand the server architecture
3. `src/server/services/anomaly.ts` - Understand detection logic
4. `src/client/hooks/useWebSocket.ts` - Understand frontend data flow

## External APIs

### Polymarket APIs (No Auth Required)

| API | Base URL | Purpose |
|-----|----------|---------|
| Gamma API | `https://gamma-api.polymarket.com` | Market metadata |
| Data API | `https://data-api.polymarket.com` | Trade history |
| CLOB API | `https://clob.polymarket.com` | Prices, orderbooks |
| WebSocket | `wss://ws-subscriptions-clob.polymarket.com/ws/market` | Real-time updates |

### Rate Limits
- Burst: ~350 requests/second
- Sustained: ~100 requests/minute for read endpoints
- Use WebSocket for real-time data to minimize REST calls

## Testing Changes

```bash
# Start both servers
npm run dev          # Terminal 1 - Backend
npm run dev:client   # Terminal 2 - Frontend

# Check if backend is healthy
curl http://localhost:3000/api/stats

# View frontend
open http://localhost:5173
```

## Common Issues

### "Unknown Market" entries
- Caused by WebSocket trades arriving before market metadata is fetched
- Solution: The `getMarketTitle` function caches market titles, or run `/api/cleanup-unknown`

### Database locked errors
- SQLite doesn't handle concurrent writes well
- Solution: Ensure only one server instance is running

### WebSocket disconnections
- Normal behavior, the client auto-reconnects
- Check `src/server/services/websocket.ts` for reconnection logic

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Prisma database connection string |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Environment (development/production) |

## Deployment Notes

- Railway deployment configured in `railway.json`
- Docker support via `Dockerfile`
- For production, use PostgreSQL instead of SQLite (update `DATABASE_URL`)

---

*This file helps AI agents understand the project structure and conventions. Update it when making significant architectural changes.*
