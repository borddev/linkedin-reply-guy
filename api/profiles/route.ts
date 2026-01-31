import { NextResponse } from 'next/server';

const ADSPOWER_API = process.env.ADSPOWER_API || 'http://127.0.0.1:50325';

export async function GET() {
  try {
    const res = await fetch(`${ADSPOWER_API}/api/v1/user/list?page_size=100`, {
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();

    if (data.code !== 0) {
      return NextResponse.json({ error: data.msg, profiles: [] });
    }

    const profiles = (data.data?.list || []).map((p: any) => ({
      id: p.user_id,
      name: p.name || p.user_id,
      remark: p.remark || '',
      group: p.group_name || '',
    }));

    return NextResponse.json({ profiles });
  } catch {
    return NextResponse.json({
      error: 'AdsPower not running. Open AdsPower app first.',
      profiles: []
    });
  }
}
