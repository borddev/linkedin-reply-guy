'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ConnectionsPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/linkedin-reply-guy/api/connections').then(r => r.json()).then(setData);
  }, []);

  if (!data) return <div style={{ background: '#000', minHeight: '100vh', padding: 40, color: '#666' }}>Loading...</div>;

  const stats = data.stats || {};
  const recentConnections = data.recent || [];

  return (
    <div style={{ background: '#000', color: '#fff', minHeight: '100vh', padding: '30px 40px', fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>Connections</h1>
        <Link href="/linkedin-reply-guy" style={{ color: '#666', fontSize: 12, textDecoration: 'underline' }}>back</Link>
      </div>

      {/* Stats */}
      <table style={{ width: '100%', maxWidth: 400, borderCollapse: 'collapse', fontSize: 13, marginBottom: 40 }}>
        <tbody>
          <tr style={{ borderBottom: '1px solid #222' }}>
            <td style={{ padding: '8px 0', color: '#666' }}>Sent</td>
            <td style={{ padding: '8px 0', textAlign: 'right' }}>{stats.totalSent || 0}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #222' }}>
            <td style={{ padding: '8px 0', color: '#666' }}>Accepted</td>
            <td style={{ padding: '8px 0', textAlign: 'right' }}>{stats.totalAccepted || 0}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #222' }}>
            <td style={{ padding: '8px 0', color: '#666' }}>Acceptance Rate</td>
            <td style={{ padding: '8px 0', textAlign: 'right' }}>{stats.acceptanceRate || 0}%</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #222' }}>
            <td style={{ padding: '8px 0', color: '#666' }}>Pending</td>
            <td style={{ padding: '8px 0', textAlign: 'right' }}>{stats.pending || 0}</td>
          </tr>
        </tbody>
      </table>

      {/* Recent connections */}
      {recentConnections.length > 0 && (
        <>
          <div style={{ marginBottom: 12, fontSize: 12, color: '#666' }}>Recent Accepted</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333' }}>
                <th style={{ padding: '8px 0', color: '#666', textAlign: 'left', fontWeight: 400 }}>Name</th>
                <th style={{ padding: '8px 0', color: '#666', textAlign: 'left', fontWeight: 400 }}>Title</th>
                <th style={{ padding: '8px 0', color: '#666', textAlign: 'left', fontWeight: 400 }}>Source</th>
                <th style={{ padding: '8px 0', color: '#666', textAlign: 'right', fontWeight: 400 }}>Days</th>
              </tr>
            </thead>
            <tbody>
              {recentConnections.map((c: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid #181818' }}>
                  <td style={{ padding: '6px 0', color: '#ccc' }}>{c.name}</td>
                  <td style={{ padding: '6px 0', color: '#666', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title || '-'}</td>
                  <td style={{ padding: '6px 0', color: '#666' }}>{c.source || '-'}</td>
                  <td style={{ padding: '6px 0', textAlign: 'right', color: '#666' }}>
                    {c.days_to_accept !== null ? c.days_to_accept + 'd' : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <div style={{ marginTop: 40, padding: 16, background: '#111', fontSize: 11, color: '#666', lineHeight: 1.5 }}>
        <strong style={{ color: '#888' }}>Note:</strong> Connection requests are limited to 50/week.
        The bot sends personalized messages based on the target&apos;s title and shared interests.
      </div>
    </div>
  );
}
