'use client';

import { useState, useEffect, useMemo } from 'react';
import { agentConfig } from './agent-config';

interface Comment {
  id: string;
  comment_text: string;
  post_url: string;
  post_text: string;
  post_author: string;
  author_title: string;
  strategy: string;
  impressions: number;
  likes: number;
  replies: number;
  posted_at: string;
}

interface Script {
  id: string;
  name: string;
  description: string;
  script: string;
  path: string;
}

type SortField = 'impressions' | 'likes' | 'replies' | 'strategy' | 'posted' | 'author';
type SortDir = 'asc' | 'desc';

export default function LinkedInReplyGuyPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('posted');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Script | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [hoveredComment, setHoveredComment] = useState<Comment | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });

  function getToday() { return new Date().toISOString().split('T')[0]; }
  function getYesterday() { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; }
  function getDaysAgo(days: number) { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString().split('T')[0]; }

  useEffect(() => { loadComments(); }, []);

  async function loadComments() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/linkedin-reply-guy/api/comments');
      const data = await res.json();
      if (data.error) setError(data.error);
      else {
        setComments(data.comments || []);
        setLastSync(data.lastSync || null);
      }
    } catch { setError('Failed to load'); }
    setLoading(false);
  }

  function formatLastSync(dateStr: string | null): string {
    if (!dateStr) return 'Never';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatTimeAgo(date: Date): string {
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const sortedComments = useMemo(() => {
    let filtered = comments;
    if (filter !== 'all') filtered = filtered.filter(c => c.strategy === filter);
    if (dateFrom) {
      const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
      filtered = filtered.filter(c => c.posted_at && new Date(c.posted_at) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
      filtered = filtered.filter(c => c.posted_at && new Date(c.posted_at) <= to);
    }
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'impressions') cmp = (a.impressions || 0) - (b.impressions || 0);
      else if (sortField === 'likes') cmp = (a.likes || 0) - (b.likes || 0);
      else if (sortField === 'replies') cmp = (a.replies || 0) - (b.replies || 0);
      else if (sortField === 'strategy') cmp = (a.strategy || '').localeCompare(b.strategy || '');
      else if (sortField === 'posted') cmp = new Date(a.posted_at).getTime() - new Date(b.posted_at).getTime();
      else if (sortField === 'author') cmp = (a.post_author || '').localeCompare(b.post_author || '');
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [comments, filter, dateFrom, dateTo, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    else { setSortField(field); setSortDir('desc'); }
  }

  const totalImpressions = sortedComments.reduce((s, c) => s + (c.impressions || 0), 0);
  const totalLikes = sortedComments.reduce((s, c) => s + (c.likes || 0), 0);
  const strategies = ['all', 'insight', 'question', 'story', 'agree_expand'];

  const SortIcon = ({ field }: { field: SortField }) => (
    <span style={{ marginLeft: 4, opacity: sortField === field ? 1 : 0.3, fontSize: 10 }}>
      {sortField === field ? (sortDir === 'desc' ? '\u25BC' : '\u25B2') : '\u25BC'}
    </span>
  );

  const headerStyle: React.CSSProperties = {
    padding: '8px 6px', color: '#888', cursor: 'pointer', userSelect: 'none', fontSize: 11, fontWeight: 500
  };

  const LinkedInIcon = ({ size = 28, color = '#fff' }: { size?: number; color?: string }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );

  return (
    <div style={{ background: '#000', color: '#fff', minHeight: '100vh', padding: '30px 40px 100px', fontFamily: 'system-ui', position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LinkedInIcon />
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>Reply Guy</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#555', fontSize: 11 }}>Updated {formatLastSync(lastSync)}</span>
          <a href="/linkedin-reply-guy/connections" style={{
            color: '#fff', fontSize: 11, textDecoration: 'none', padding: '6px 12px', borderRadius: 20,
            background: '#222', border: '1px solid #333', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Connections
          </a>
          <a href="/linkedin-reply-guy/school" style={{
            color: '#fff', fontSize: 11, textDecoration: 'none', padding: '6px 12px', borderRadius: 20,
            background: '#222', border: '1px solid #333', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/>
            </svg>
            School
          </a>
          <button onClick={loadComments} disabled={loading} style={{
            background: '#0A66C2', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 20,
            fontSize: 12, fontWeight: 500, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 40, marginBottom: 30 }}>
        <div>
          <div style={{ color: '#888', fontSize: 11 }}>IMPRESSIONS</div>
          <div style={{ fontSize: 28, fontWeight: 600 }}>{totalImpressions.toLocaleString()}</div>
        </div>
        <div>
          <div style={{ color: '#888', fontSize: 11 }}>LIKES</div>
          <div style={{ fontSize: 28, fontWeight: 600 }}>{totalLikes.toLocaleString()}</div>
        </div>
        <div>
          <div style={{ color: '#888', fontSize: 11 }}>COMMENTS</div>
          <div style={{ fontSize: 28, fontWeight: 600 }}>{sortedComments.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{
          background: '#111', color: '#fff', border: '1px solid #333', padding: '8px 12px',
          borderRadius: 4, fontSize: 12, cursor: 'pointer', minWidth: 150
        }}>
          {strategies.map(s => (
            <option key={s} value={s}>{s === 'all' ? 'All Strategies' : s}</option>
          ))}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {[
            { label: 'All', days: 0 },
            { label: 'Today', days: 1 },
            { label: 'Yesterday', days: -1 },
            { label: '7d', days: 7 },
            { label: '1m', days: 30 },
          ].map(({ label, days }) => {
            const isActive = days === 0 ? !dateFrom && !dateTo
              : days === -1 ? dateFrom === getYesterday() && dateTo === getYesterday()
              : days === 1 ? dateFrom === getToday() && !dateTo
              : dateFrom === getDaysAgo(days) && !dateTo;
            return (
              <button key={label} onClick={() => {
                if (days === 0) { setDateFrom(''); setDateTo(''); }
                else if (days === -1) { setDateFrom(getYesterday()); setDateTo(getYesterday()); }
                else if (days === 1) { setDateFrom(getToday()); setDateTo(''); }
                else { setDateFrom(getDaysAgo(days)); setDateTo(''); }
              }} style={{
                background: isActive ? '#0A66C2' : 'transparent', color: isActive ? '#fff' : '#888',
                border: 'none', padding: '6px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer'
              }}>
                {label}
              </button>
            );
          })}
          <div style={{ position: 'relative', marginLeft: 4 }}>
            <button onClick={() => setShowDatePicker(!showDatePicker)} style={{
              background: 'transparent', color: '#888', border: 'none', padding: '6px 10px',
              borderRadius: 20, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center'
            }} title="Custom date range">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </button>
            {showDatePicker && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 8, background: '#111',
                border: '1px solid #333', borderRadius: 8, padding: 12, zIndex: 100, minWidth: 200
              }}>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ color: '#666', fontSize: 10, display: 'block', marginBottom: 4 }}>From</label>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{
                    background: '#000', color: '#fff', border: '1px solid #333', padding: '6px 10px',
                    borderRadius: 4, fontSize: 12, width: '100%'
                  }} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ color: '#666', fontSize: 10, display: 'block', marginBottom: 4 }}>To</label>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{
                    background: '#000', color: '#fff', border: '1px solid #333', padding: '6px 10px',
                    borderRadius: 4, fontSize: 12, width: '100%'
                  }} />
                </div>
                <button onClick={() => setShowDatePicker(false)} style={{
                  background: '#0A66C2', color: '#fff', border: 'none', padding: '6px 12px',
                  borderRadius: 4, fontSize: 11, cursor: 'pointer', width: '100%'
                }}>Apply</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <div style={{ color: '#f00', marginBottom: 20 }}>{error}</div>}

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #333' }}>
              <th style={{ ...headerStyle, textAlign: 'right' }} onClick={() => toggleSort('impressions')}>Impr<SortIcon field="impressions" /></th>
              <th style={{ ...headerStyle, textAlign: 'right' }} onClick={() => toggleSort('likes')}>Likes<SortIcon field="likes" /></th>
              <th style={{ ...headerStyle, textAlign: 'right' }} onClick={() => toggleSort('replies')}>Replies<SortIcon field="replies" /></th>
              <th style={{ ...headerStyle, textAlign: 'left' }} onClick={() => toggleSort('strategy')}>Strategy<SortIcon field="strategy" /></th>
              <th style={{ ...headerStyle, textAlign: 'left' }} onClick={() => toggleSort('author')}>Author<SortIcon field="author" /></th>
              <th style={{ ...headerStyle, textAlign: 'left' }} onClick={() => toggleSort('posted')}>Posted<SortIcon field="posted" /></th>
              <th style={{ ...headerStyle, textAlign: 'left' }}>Comment</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 20, color: '#888' }}>Loading...</td></tr>
            ) : sortedComments.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 20, color: '#888' }}>No comments yet</td></tr>
            ) : sortedComments.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #222' }}>
                <td style={{ textAlign: 'right', padding: 10 }}>{(c.impressions || 0).toLocaleString()}</td>
                <td style={{ textAlign: 'right', padding: 10, color: '#666' }}>{c.likes || 0}</td>
                <td style={{ textAlign: 'right', padding: 10, color: '#666' }}>{c.replies || 0}</td>
                <td style={{ padding: 10, fontSize: 10, color: '#888' }}>{c.strategy || '-'}</td>
                <td style={{ padding: 10, fontSize: 11, color: '#888', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.post_author || '-'}
                </td>
                <td style={{ padding: 10, color: '#666', fontSize: 11, whiteSpace: 'nowrap' }}>
                  {c.posted_at ? formatTimeAgo(new Date(c.posted_at)) : '-'}
                </td>
                <td style={{ padding: 10, position: 'relative' }}>
                  <span
                    style={{
                      color: hoveredComment?.id === c.id ? '#0A66C2' : '#fff',
                      cursor: 'pointer', transition: 'color 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoverPosition({ x: rect.left, y: rect.bottom + 8 });
                      setHoveredComment(c);
                    }}
                    onMouseLeave={() => setHoveredComment(null)}
                    onClick={() => c.post_url && window.open(c.post_url, '_blank')}
                  >
                    {c.comment_text}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Comment Preview Popup */}
      {hoveredComment && (
        <div style={{
          position: 'fixed', left: Math.min(hoverPosition.x, window.innerWidth - 420), top: hoverPosition.y,
          width: 400, background: '#000', border: '1px solid #333', borderRadius: 16, padding: 16,
          zIndex: 1000, boxShadow: '0 4px 24px rgba(0,0,0,0.5)', pointerEvents: 'none'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', background: '#0A66C2',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <LinkedInIcon size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{hoveredComment.post_author || 'Author'}</div>
              <div style={{ color: '#666', fontSize: 12 }}>{hoveredComment.author_title || ''}</div>
            </div>
          </div>
          {hoveredComment.post_text && (
            <div style={{ fontSize: 13, color: '#888', lineHeight: 1.4, marginBottom: 12, padding: 12, background: '#111', borderRadius: 12, border: '1px solid #222' }}>
              {hoveredComment.post_text.slice(0, 200)}{hoveredComment.post_text.length > 200 ? '...' : ''}
            </div>
          )}
          <div style={{ fontSize: 15, lineHeight: 1.5, marginBottom: 12 }}>{hoveredComment.comment_text}</div>
          <div style={{ display: 'flex', gap: 20, color: '#666', fontSize: 13, paddingTop: 12, borderTop: '1px solid #222' }}>
            <span>{hoveredComment.impressions?.toLocaleString() || 0} impressions</span>
            <span>{hoveredComment.likes || 0} likes</span>
          </div>
        </div>
      )}

      {/* Tools Section */}
      <div style={{ marginTop: 40, padding: 20, background: '#111', borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 14, color: '#888' }}>Tools</h3>
          <button onClick={loadComments} disabled={loading} style={{
            background: '#222', color: '#888', border: 'none', padding: '6px 12px', borderRadius: 4, fontSize: 11, cursor: 'pointer'
          }}>Refresh</button>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {agentConfig.scripts.map((s: Script) => (
            <button key={s.id} onClick={() => setSelectedTool(selectedTool?.id === s.id ? null : s)} style={{
              background: selectedTool?.id === s.id ? '#0A66C2' : '#222', color: '#fff', border: 'none',
              padding: '10px 16px', borderRadius: 6, fontSize: 12, cursor: 'pointer'
            }}>
              {s.name}
            </button>
          ))}
        </div>
        {selectedTool && (
          <div style={{ marginTop: 16, padding: 16, background: '#0a0a0a', borderRadius: 8, border: '1px solid #222' }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>{selectedTool.name}</div>
            <p style={{ margin: '0 0 12px 0', color: '#888', fontSize: 12, lineHeight: 1.5 }}>{selectedTool.description}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#555', fontSize: 10 }}>File:</span>
              <span style={{ color: '#0A66C2', fontSize: 11 }}>{selectedTool.path}</span>
            </div>
          </div>
        )}
      </div>

      {/* Agent Card */}
      <div onClick={() => setShowAgentModal(true)} style={{
        position: 'fixed', bottom: 24, right: 24, background: '#111', border: '1px solid #333',
        borderRadius: 12, padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center',
        gap: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.5)', zIndex: 100
      }}>
        <div style={{ width: 32, height: 32, borderRadius: 6, background: '#0A66C2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LinkedInIcon size={18} />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500 }}>{agentConfig.name}</div>
          <div style={{ fontSize: 10, color: '#666', maxWidth: 180 }}>{agentConfig.description}</div>
        </div>
      </div>

      {/* Agent Modal */}
      {showAgentModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }} onClick={() => setShowAgentModal(false)}>
          <div style={{ background: '#111', borderRadius: 12, padding: 24, maxWidth: 600, maxHeight: '80vh', overflow: 'auto', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowAgentModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#666', fontSize: 20, cursor: 'pointer' }}>x</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 8, background: '#0A66C2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LinkedInIcon size={24} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 18 }}>{agentConfig.name}</h2>
                <p style={{ margin: '4px 0 0 0', color: '#888', fontSize: 12 }}>{agentConfig.description}</p>
              </div>
            </div>
            <div style={{ marginBottom: 20, padding: 12, background: '#0a0a0a', borderRadius: 6 }}>
              <div style={{ color: '#555', fontSize: 10, marginBottom: 4 }}>Agent File</div>
              <span style={{ color: '#0A66C2', fontSize: 12 }}>{agentConfig.filePath}</span>
            </div>
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: 13, color: '#888' }}>System Prompt</h3>
              <pre style={{ background: '#000', padding: 16, borderRadius: 8, fontSize: 11, lineHeight: 1.5, whiteSpace: 'pre-wrap', color: '#ccc', maxHeight: 300, overflow: 'auto' }}>
                {agentConfig.prompt}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
