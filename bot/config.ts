export const config = {
  // AdsPower
  ADSPOWER_API: process.env.ADSPOWER_API || 'http://127.0.0.1:50325',
  ADSPOWER_PROFILE_ID: process.env.ADSPOWER_PROFILE_ID || '',

  // Targeting
  MIN_LIKES: 10,
  MIN_AUTHOR_FOLLOWERS: 5000,
  MAX_POST_AGE_HOURS: 6,
  PREFERRED_AUTHOR_FOLLOWERS: { min: 10000, max: 500000 },

  // Rate limits
  COMMENT_INTERVAL_MS: 240000,      // 4 min between comments
  MAX_COMMENTS_PER_DAY: 25,
  MAX_CONNECTIONS_PER_WEEK: 50,
  SCROLL_PAUSE_MS: { min: 2000, max: 5000 },

  // Strategies (weights must sum to 100)
  STRATEGY_WEIGHTS: {
    insight: 40,
    question: 25,
    story: 20,
    agree_expand: 15,
  },

  // Content rules
  SKIP_TOPICS: [
    'hiring', 'job opening', 'we are looking for',
    'crypto', 'nft', 'web3',
    'grind', 'hustle culture',
    'motivational quote',
  ],

  // LinkedIn selectors (update if LinkedIn changes DOM)
  SELECTORS: {
    feedPost: 'div.feed-shared-update-v2',
    postText: 'span.break-words',
    authorName: 'span.update-components-actor__name',
    authorTitle: 'span.update-components-actor__description',
    likeCount: 'span.social-details-social-counts__reactions-count',
    commentBox: 'div.comments-comment-box__form',
    commentInput: 'div.ql-editor',
    submitButton: 'button.comments-comment-box__submit-button',
  },
};
