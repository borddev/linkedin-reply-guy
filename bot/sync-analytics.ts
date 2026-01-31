import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { config } from './config';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function randomBetween(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function connectBrowser() {
  const res = await fetch(`${config.ADSPOWER_API}/api/v1/browser/start?user_id=${config.ADSPOWER_PROFILE_ID}`);
  const data = await res.json();
  if (data.code !== 0) throw new Error(`AdsPower error: ${data.msg}`);
  const browser = await chromium.connectOverCDP(data.data.ws.puppeteer);
  const context = browser.contexts()[0];
  const page = context.pages()[0] || await context.newPage();
  return { browser, page };
}

async function main() {
  console.log('LinkedIn Analytics Sync starting...');

  // Get comments that need updating
  const { data: comments } = await supabase
    .from('linkedin_comments')
    .select('id, post_url, comment_text')
    .order('posted_at', { ascending: false })
    .limit(50);

  if (!comments || comments.length === 0) {
    console.log('No comments to sync');
    return;
  }

  const { browser, page } = await connectBrowser();
  let updated = 0;

  try {
    // Go to LinkedIn activity page
    await page.goto('https://www.linkedin.com/in/me/recent-activity/comments/', { waitUntil: 'networkidle' });
    await sleep(3000);

    // Scroll to load activity
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 600));
      await sleep(randomBetween(2000, 4000));
    }

    // Scrape analytics from activity feed
    const activities = await page.evaluate(() => {
      const items: Array<{ text: string; impressions: number; likes: number; replies: number }> = [];
      const posts = document.querySelectorAll('div.feed-shared-update-v2');

      posts.forEach((post: any) => {
        const textEl = post.querySelector('span.break-words');
        const impEl = post.querySelector('span[aria-label*="impression"]');
        const likeEl = post.querySelector('span.social-details-social-counts__reactions-count');
        const commentEl = post.querySelector('button[aria-label*="comment"]');

        items.push({
          text: textEl?.textContent?.trim()?.slice(0, 200) || '',
          impressions: parseInt(impEl?.textContent?.replace(/[^0-9]/g, '') || '0') || 0,
          likes: parseInt(likeEl?.textContent?.replace(/[^0-9]/g, '') || '0') || 0,
          replies: parseInt(commentEl?.textContent?.replace(/[^0-9]/g, '') || '0') || 0,
        });
      });

      return items;
    });

    console.log(`Found ${activities.length} activities on page`);

    // Match and update
    for (const comment of comments) {
      const match = activities.find(a =>
        a.text && comment.comment_text &&
        a.text.includes(comment.comment_text.slice(0, 50))
      );

      if (match && (match.impressions > 0 || match.likes > 0)) {
        await supabase
          .from('linkedin_comments')
          .update({
            impressions: match.impressions,
            likes: match.likes,
            replies: match.replies,
          })
          .eq('id', comment.id);

        updated++;
        console.log(`Updated: "${comment.comment_text.slice(0, 40)}..." - ${match.impressions} imp, ${match.likes} likes`);
      }
    }

    // Update sync status
    await supabase
      .from('linkedin_sync_status')
      .upsert({ id: 'analytics', synced_at: new Date().toISOString(), data: { updated, total: comments.length } });

    console.log(`\nDone! Updated ${updated}/${comments.length} comments.`);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
