import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET() {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ stats: {}, recent: [], error: 'Supabase not configured' });
    }

    const { data, error } = await supabase
      .from('linkedin_connections')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(500);

    if (error) {
      return NextResponse.json({ stats: {}, recent: [], error: error.message });
    }

    const connections = data || [];
    const totalSent = connections.length;
    const totalAccepted = connections.filter(c => c.accepted).length;
    const acceptanceRate = totalSent > 0 ? Math.round((totalAccepted / totalSent) * 100) : 0;
    const pending = totalSent - totalAccepted;

    const recent = connections
      .filter(c => c.accepted && c.accepted_at)
      .sort((a, b) => new Date(b.accepted_at).getTime() - new Date(a.accepted_at).getTime())
      .slice(0, 20)
      .map(c => ({
        name: c.name,
        title: c.title,
        company: c.company,
        source: c.source,
        days_to_accept: c.sent_at && c.accepted_at
          ? Math.round((new Date(c.accepted_at).getTime() - new Date(c.sent_at).getTime()) / (1000 * 60 * 60 * 24))
          : null
      }));

    return NextResponse.json({
      stats: { totalSent, totalAccepted, acceptanceRate, pending },
      recent
    });
  } catch {
    return NextResponse.json({ stats: {}, recent: [], error: 'Failed to load' });
  }
}
