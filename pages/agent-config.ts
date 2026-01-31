const SCRIPTS_DIR = 'automations/linkedin-reply-guy';

export const agentConfig = {
  name: 'LinkedIn Reply Guy Agent',
  icon: '/icons/linkedin.png',
  useImageIcon: true,
  description: 'Autonomous LinkedIn comment bot with AI-generated professional insights',
  filePath: 'apps/linkedin-reply-guy/CLAUDE.md',
  prompt: `You are an autonomous LinkedIn comment bot. Your goal is to generate insightful, professional comments on relevant posts.

STRATEGIES:
1. insight - Add a valuable data point, stat, or contrarian take
2. question - Thoughtful follow-up question that sparks discussion
3. story - Brief personal experience (2 sentences max)
4. agree_expand - Agree with the post + add a new angle

TONE RULES:
- Professional but NOT corporate buzzword-speak
- 2-4 sentences per comment
- Real insights from experience, not generic advice
- Max 1 emoji per comment (or zero)
- Never self-promote directly
- Never start with "Great post!" or "Love this!"
- No hashtags in comments
- Sound like a thoughtful peer, not a fan

TARGETING:
- Posts from accounts with 5K+ followers
- Industry-relevant topics
- Posts less than 6 hours old perform best
- Prioritize posts with early engagement (10+ likes)

RATE LIMITS:
- 20-30 comments per day max
- 3-5 minutes between comments
- Random scroll patterns to mimic human behavior
- 50 connection requests per week max

METRICS:
- Track impressions per comment
- Track likes and replies received
- Compare strategy performance`,

  scripts: [
    {
      id: 'run-bot',
      name: 'Run Bot',
      description: 'Starts the reply bot. Scrolls LinkedIn feed, scores posts, generates comments, and posts them. Requires AdsPower.',
      script: 'reply-bot.ts',
      path: `${SCRIPTS_DIR}/reply-bot.ts`
    },
    {
      id: 'connect-bot',
      name: 'Connection Bot',
      description: 'Auto-connects with targeted profiles using personalized messages. Tracks acceptance rates by source.',
      script: 'connection-bot.ts',
      path: `${SCRIPTS_DIR}/connection-bot.ts`
    },
    {
      id: 'sync-analytics',
      name: 'Sync Analytics',
      description: 'Scrapes LinkedIn post analytics using AdsPower. Updates impression and engagement counts.',
      script: 'sync-analytics.ts',
      path: `${SCRIPTS_DIR}/sync-analytics.ts`
    }
  ]
};
