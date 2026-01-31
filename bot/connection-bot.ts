import { chromium } from 'playwright';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { config } from './config';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
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

async function generateConnectionMessage(name: string, title: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 150,
    messages: [{
      role: 'user',
      content: `Write a short LinkedIn connection request message (max 200 chars).

TO: ${name}, ${title}

RULES:
- Be genuine and specific to their role
- Mention a shared interest or why you want to connect
- No generic "I'd like to add you to my network"
- Keep it under 200 characters
- Professional but warm

OUTPUT: Just the message text.`
    }]
  });

  return ((response.content[0] as any).text?.trim() || '').slice(0, 200);
}

interface ProfileInfo {
  url: string;
  name: string;
  title: string;
  company: string;
}

async function scrapeProfiles(page: any, source: string): Promise<ProfileInfo[]> {
  // Navigate to a relevant page (e.g., post commenters, event attendees)
  await page.goto(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(source)}`, { waitUntil: 'networkidle' });
  await sleep(3000);

  // Scroll to load results
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollBy(0, 600));
    await sleep(randomBetween(2000, 4000));
  }

  const profiles = await page.evaluate(() => {
    const results: ProfileInfo[] = [];
    const cards = document.querySelectorAll('li.reusable-search__result-container');
    cards.forEach((card: any) => {
      const link = card.querySelector('a.app-aware-link');
      const nameEl = card.querySelector('span[dir="ltr"]');
      const titleEl = card.querySelector('div.entity-result__primary-subtitle');
      const companyEl = card.querySelector('div.entity-result__secondary-subtitle');

      if (link && nameEl) {
        results.push({
          url: link.href?.split('?')[0] || '',
          name: nameEl.textContent?.trim() || '',
          title: titleEl?.textContent?.trim() || '',
          company: companyEl?.textContent?.trim() || '',
        });
      }
    });
    return results;
  });

  return profiles.slice(0, 10);
}

async function sendConnectionRequest(page: any, profile: ProfileInfo, message: string): Promise<boolean> {
  try {
    await page.goto(profile.url, { waitUntil: 'networkidle' });
    await sleep(2000);

    // Click Connect button
    const connectBtn = await page.$('button[aria-label*="Connect"]');
    if (!connectBtn) {
      console.log(`No connect button for ${profile.name}`);
      return false;
    }

    await connectBtn.click();
    await sleep(1500);

    // Click "Add a note"
    const addNoteBtn = await page.$('button[aria-label="Add a note"]');
    if (addNoteBtn) {
      await addNoteBtn.click();
      await sleep(1000);

      const textarea = await page.$('textarea[name="message"]');
      if (textarea) {
        await textarea.fill(message);
        await sleep(500);
      }
    }

    // Send
    const sendBtn = await page.$('button[aria-label="Send invitation"]');
    if (sendBtn) {
      await sendBtn.click();
      await sleep(2000);
      return true;
    }

    return false;
  } catch (err) {
    console.error(`Failed to connect with ${profile.name}:`, err);
    return false;
  }
}

async function main() {
  const sources = (process.argv[2] || 'startup founder,product manager').split(',').map(s => s.trim());
  console.log(`LinkedIn Connection Bot - sources: ${sources.join(', ')}`);

  const { browser, page } = await connectBrowser();
  let sentThisRun = 0;
  const maxPerRun = 10;

  try {
    for (const source of sources) {
      if (sentThisRun >= maxPerRun) break;

      console.log(`\nSearching: ${source}`);
      const profiles = await scrapeProfiles(page, source);
      console.log(`Found ${profiles.length} profiles`);

      // Check existing
      const { data: existing } = await supabase
        .from('linkedin_connections')
        .select('profile_url')
        .in('profile_url', profiles.map(p => p.url));

      const existingUrls = new Set((existing || []).map(e => e.profile_url));
      const newProfiles = profiles.filter(p => !existingUrls.has(p.url));

      for (const profile of newProfiles) {
        if (sentThisRun >= maxPerRun) break;

        const message = await generateConnectionMessage(profile.name, profile.title);
        console.log(`Connecting: ${profile.name} (${profile.title})`);
        console.log(`Message: ${message}`);

        const sent = await sendConnectionRequest(page, profile, message);

        if (sent) {
          await supabase.from('linkedin_connections').insert({
            profile_url: profile.url,
            name: profile.name,
            title: profile.title,
            company: profile.company,
            source,
            message,
            sent_at: new Date().toISOString(),
          });

          sentThisRun++;
          console.log(`Sent! (${sentThisRun}/${maxPerRun})`);
        }

        await sleep(randomBetween(30000, 60000));
      }
    }

    console.log(`\nDone! ${sentThisRun} connection requests sent.`);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
