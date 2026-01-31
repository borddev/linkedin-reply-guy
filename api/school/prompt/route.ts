import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET() {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ prompt: 'Supabase not configured' });
    }

    const { data: comments } = await supabase
      .from('linkedin_comments')
      .select('comment_text, post_text, post_author, impressions, likes, school_rating, school_comment, strategy')
      .not('school_rating', 'is', null)
      .order('posted_at', { ascending: false })
      .limit(50);

    if (!comments || comments.length === 0) {
      return NextResponse.json({ prompt: 'No reviewed comments yet. Review some comments first!' });
    }

    const good = comments.filter(c => c.school_rating === 'good');
    const bad = comments.filter(c => c.school_rating === 'bad');

    const prompt = `# LinkedIn Comment Training Data

Based on manual review, here are examples of good and bad comments:

## GOOD COMMENTS (${good.length} examples)

${good.map(c => `- Comment: "${c.comment_text}"
  On post by: ${c.post_author || 'unknown'}
  Impressions: ${c.impressions || 0} | Likes: ${c.likes || 0}
  Strategy: ${c.strategy || 'unknown'}
  ${c.school_comment ? `Note: ${c.school_comment}` : ''}`).join('\n\n')}

## BAD COMMENTS (${bad.length} examples)

${bad.map(c => `- Comment: "${c.comment_text}"
  On post by: ${c.post_author || 'unknown'}
  Impressions: ${c.impressions || 0} | Likes: ${c.likes || 0}
  Strategy: ${c.strategy || 'unknown'}
  ${c.school_comment ? `Note: ${c.school_comment}` : ''}`).join('\n\n')}

## LINKEDIN COMMENT GUIDELINES

Based on good comments:
- ${good.length > 0 ? 'Mirror the tone: professional but authentic, adding real value' : 'More data needed'}
- Keep comments 2-4 sentences
- Add specific insights, not generic agreement
- Max 1 emoji (or zero)

Based on bad comments:
- ${bad.length > 0 ? 'Avoid: generic praise, corporate buzzwords, self-promotion' : 'More data needed'}
- Never start with "Great post!" or "Love this!"
- No hashtags in comments
`;

    return NextResponse.json({ prompt });
  } catch {
    return NextResponse.json({ prompt: 'Error generating prompt' });
  }
}
