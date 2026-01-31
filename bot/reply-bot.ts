import { chromium } from 'playwright';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { config } from './config';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface Post {
  id: string;
  url: string;
  text: string;
  author: string;
  authorTitle: string;
  likes: number;
}

function pickStrategy(): string {
  const weights = config.STRATEGY_WEIGHTS;
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  for (const [strategy, weight] of Object.entries(weights)) {
    rand -= weight;
    if (rand <= 0) return strategy;
  }
  return 'insight';
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function connectBrowser() {
  const res = await fetch(`${config.ADSPOWER_API}/api/v1/browser/start?user_id=${config.ADSPOWER_PROFILE_ID}`);
  const data = await res.json();
  if (data.code !== 0) throw new Error(`AdsPower error: ${data.msg}`);
  const browser = await chromium.connectOverCDP(data.data.ws.puppeteer);
  const context = browser.contexts()[0];
  const page = context.pages()[0] || await context.newPage();
  return { browser, page };
}

async function scrapeFeed(page: any): Promise<Post[]> {
  await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'networkidle' });
  await sleep(3000);

  // Scroll a few times to load posts
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollBy(0, 800));
    await sleep(randomBetween(config.SCROLL_PAUSE_MS.min, config.SCROLL_PAUSE_MS.max));
  }

  const posts = await page.evaluate((sel: typeof config.SELECTORS) => {
    const elements = document.querySelectorAll(sel.feedPost);
    return Array.from(elements).slice(0, 20).map((el: any) => {
      const textEl = el.querySelector(sel.postText);
      const authorEl = el.querySelector(sel.authorName);
      const titleEl = el.querySelector(sel.authorTitle);
      const likesEl = el.querySelector(sel.likeCount);
      const linkEl = el.querySelector('a[href*="/feed/update/"]');

      return {
        id: linkEl?.href?.match(/urn:li:activity:(\d+)/)?.[1] || Math.random().toString(36).slice(2),
        url: linkEl?.href || '',
        text: textEl?.textContent?.trim() || '',
        author: authorEl?.textContent?.trim() || '',
        authorTitle: titleEl?.textContent?.trim() || '',
        likes: parseInt(likesEl?.textContent?.replace(/[^0-9]/g, '') || '0') || 0,
      };
    });
  }, config.SELECTORS);

  return posts.filter((p: Post) => {
    if (!p.text || p.text.length < 50) return false;
    if (p.likes < config.MIN_LIKES) return false;
    const lower = p.text.toLowerCase();
    if (config.SKIP_TOPICS.some(t => lower.includes(t))) return false;
    return true;
  });
}

async function generateComment(post: Post, strategy: string): Promise<string | null> {
  const strategyInstructions: Record<string, string> = {
    insight: 'Add a valuable data point, contrarian take, or unique perspective the author missed. Be specific.',
    question: 'Ask a thoughtful follow-up question that shows you understood the post and sparks deeper discussion.',
    story: 'Share a brief (2 sentence max) personal experience that relates to the post. Be specific, not generic.',
    agree_expand: 'Agree with the core point, then add a new angle or dimension the author didn\'t cover.',
  };

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `You are commenting on a LinkedIn post. Generate a professional but authentic comment.

POST AUTHOR: ${post.author}
AUTHOR TITLE: ${post.authorTitle}
POST: ${post.text.slice(0, 1000)}

STRATEGY: ${strategy}
INSTRUCTIONS: ${strategyInstructions[strategy] || strategyInstructions.insight}

RULES:
- 2-4 sentences max
- Professional but not corporate
- Add real value, not generic praise
- Never start with "Great post!" or "Love this!"
- Max 1 emoji (or zero)
- No hashtags
- No self-promotion
- Sound like a thoughtful peer

OUTPUT: Just the comment text, nothing else. If this post isn't worth commenting on, reply with SKIP.`
    }]
  });

  const text = (response.content[0] as any).text?.trim();
  if (!text || text === 'SKIP') return null;
  return text;
}

async function postComment(page: any, post: Post, commentText: string): Promise<boolean> {
  try {
    // Navigate to post
    if (post.url) {
      await page.goto(post.url, { waitUntil: 'networkidle' });
      await sleep(2000);
    }

    // Click comment button to open comment box
    const commentButton = await page.$('button[aria-label*="Comment"]');
    if (commentButton) {
      await commentButton.click();
      await sleep(1500);
    }

    // Type comment
    const editor = await page.$(config.SELECTORS.commentInput);
    if (!editor) {
      console.log('Comment editor not found');
      return false;
    }

    await editor.click();
    await sleep(500);
    await page.keyboard.type(commentText, { delay: randomBetween(30, 80) });
    await sleep(1000);

    // Submit
    const submitBtn = await page.$(config.SELECTORS.submitButton);
    if (submitBtn) {
      await submitBtn.click();
      await sleep(2000);
      return true;
    }

    return false;
  } catch (err) {
    console.error('Failed to post comment:', err);
    return false;
  }
}

async function main() {
  console.log('LinkedIn Reply Bot starting...');

  const { browser, page } = await connectBrowser();
  let commentsToday = 0;

  try {
    while (commentsToday < config.MAX_COMMENTS_PER_DAY) {
      console.log(`\n--- Scanning feed (${commentsToday}/${config.MAX_COMMENTS_PER_DAY} comments today) ---`);

      const posts = await scrapeFeed(page);
      console.log(`Found ${posts.length} eligible posts`);

      if (posts.length === 0) {
        console.log('No eligible posts. Waiting 10 min...');
        await sleep(600000);
        continue;
      }

      // Check which posts we already commented on
      const { data: existing } = await supabase
        .from('linkedin_comments')
        .select('post_id')
        .in('post_id', posts.map(p => p.id));

      const existingIds = new Set((existing || []).map(e => e.post_id));
      const newPosts = posts.filter(p => !existingIds.has(p.id));

      if (newPosts.length === 0) {
        console.log('All posts already commented on. Waiting...');
        await sleep(600000);
        continue;
      }

      // Pick best post (highest likes)
      const target = newPosts.sort((a, b) => b.likes - a.likes)[0];
      const strategy = pickStrategy();

      console.log(`Target: "${target.text.slice(0, 80)}..." by ${target.author} (${target.likes} likes)`);
      console.log(`Strategy: ${strategy}`);

      const comment = await generateComment(target, strategy);

      if (!comment) {
        console.log('AI skipped this post');
        continue;
      }

      console.log(`Comment: "${comment}"`);

      const posted = await postComment(page, target, comment);

      if (posted) {
        await supabase.from('linkedin_comments').insert({
          post_id: target.id,
          post_url: target.url,
          post_text: target.text.slice(0, 2000),
          post_author: target.author,
          author_title: target.authorTitle,
          comment_text: comment,
          strategy,
          posted_at: new Date().toISOString(),
        });

        commentsToday++;
        console.log(`Posted! (${commentsToday}/${config.MAX_COMMENTS_PER_DAY})`);
      } else {
        console.log('Failed to post comment');
      }

      // Wait between comments
      const waitMs = config.COMMENT_INTERVAL_MS + randomBetween(0, 60000);
      console.log(`Waiting ${Math.round(waitMs / 1000)}s...`);
      await sleep(waitMs);
    }

    console.log(`Done! ${commentsToday} comments posted today.`);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
