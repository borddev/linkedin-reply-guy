# LinkedIn Reply Guy

AI-powered LinkedIn comment bot for BORD. Automatically comments on relevant posts and sends targeted connection requests.

## Features

- **Auto-commenting** - Scrapes feed, scores posts, generates professional comments via Claude AI
- **4 strategies** - insight, question, story, agree_expand (weighted random selection)
- **Connection bot** - Auto-connect with personalized messages
- **Comment School** - Rate past comments good/bad to train the AI
- **Analytics sync** - Track impressions and engagement per comment

## Quick Start

```bash
# Install in BORD
git clone https://github.com/borddev/linkedin-reply-guy apps/linkedin-reply-guy

# Run schema in Supabase SQL Editor
# Add env vars to .env.local
# Start BORD
npm run dev
```

## Requirements

- BORD platform
- Supabase account
- AdsPower with LinkedIn profile
- Anthropic API key
