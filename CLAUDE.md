# LinkedIn Reply Guy - Claude Code Instructions

You are setting up LinkedIn Reply Guy, an AI-powered LinkedIn comment bot.

## Overview

This app automatically:
1. Scrapes LinkedIn feed posts via AdsPower browser
2. Scores posts by engagement and relevance
3. Generates professional comments using Claude AI
4. Posts comments and tracks analytics
5. Sends personalized connection requests

## Setup Steps

### Step 1: Database Setup

Run `schema.sql` in Supabase SQL Editor. Creates:
- `linkedin_comments` - comment tracking with impressions, likes, strategy
- `linkedin_connections` - connection request tracking
- `linkedin_sync_status` - sync state

### Step 2: Environment

Add to BORD `.env.local`:
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
ADSPOWER_API=http://127.0.0.1:50325
ADSPOWER_PROFILE_ID=xxx
```

### Step 3: AdsPower

1. Open AdsPower
2. Create browser profile
3. Log into LinkedIn in that profile
4. Copy profile ID to env

### Step 4: Run

```bash
# Reply bot
npx tsx bot/reply-bot.ts

# Connection bot
npx tsx bot/connection-bot.ts "startup founder,product manager"

# Sync analytics
npx tsx bot/sync-analytics.ts
```

## Strategies

| Strategy | Weight | Description |
|----------|--------|-------------|
| insight | 40% | Data point or contrarian take |
| question | 25% | Thoughtful follow-up question |
| story | 20% | Brief personal experience |
| agree_expand | 15% | Agree + new angle |

## Rate Limits

- 20-30 comments/day
- 3-5 min between comments
- 50 connection requests/week
- Random scroll patterns

## Dashboard Pages

- `/linkedin-reply-guy` - Main analytics (impressions, likes, comments)
- `/linkedin-reply-guy/school` - Train bot by rating comments
- `/linkedin-reply-guy/connections` - Connection tracking

## Files

```
apps/linkedin-reply-guy/
├── bord-app.json        # BORD manifest
├── schema.sql           # Supabase schema
├── CLAUDE.md            # This file
├── pages/
│   ├── page.tsx         # Main dashboard
│   ├── layout.tsx
│   ├── agent-config.ts  # Strategies + prompt
│   ├── school/page.tsx  # Comment training
│   └── connections/page.tsx
├── api/
│   ├── comments/route.ts
│   ├── school/route.ts
│   ├── school/prompt/route.ts
│   └── connections/route.ts
└── bot/
    ├── config.ts
    ├── reply-bot.ts
    ├── connection-bot.ts
    └── sync-analytics.ts
```
