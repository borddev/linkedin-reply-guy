'use client';

import { useState, useEffect, useRef } from 'react';

interface Comment {
  id: string;
  post_text: string;
  comment_text: string;
  post_url: string;
  post_author: string;
  author_title: string;
  impressions: number;
  posted_at: string;
  strategy: string;
  school_rating?: string;
  school_comment?: string;
}

const GOOD_QUOTES = [
  "That's a thought leader comment right there.",
  "LinkedIn algorithm will love this.",
  "C-suite energy. Solid.",
  "This adds real value to the conversation.",
  "Would get engagement. Good insight.",
  "Professional and authentic. Nice.",
  "This is how you build a network.",
  "Genuinely helpful comment.",
  "The kind of comment people remember.",
  "Strong take. Well articulated.",
];

const BAD_QUOTES = [
  "This reads like a LinkedIn bro post.",
  "Too generic. Anyone could write this.",
  "Sounds like corporate buzzword soup.",
  "This adds nothing to the conversation.",
  "Would get scrolled past instantly.",
  "Cringe. Delete this.",
  "This is why people hate LinkedIn.",
  "Zero substance, all fluff.",
  "The 'Great post!' energy is strong here.",
  "Needs more depth and specificity.",
];

const SKIP_QUOTES = [
  "Meh. Not terrible, not great.",
  "Could go either way honestly.",
  "Forgettable but inoffensive.",
  "The LinkedIn equivalent of elevator music.",
  "It exists. That's about it.",
];

function useTypingEffect(text: string, speed: number = 30) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    if (!text) return;
    setDisplayed('');
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) { setDisplayed(text.slice(0, i + 1)); i++; }
      else clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);
  return displayed;
}

function Mascot({ mood, quote, visible }: { mood: string; quote: string; visible: boolean }) {
  const typed = useTypingEffect(visible ? quote : '', 25);
  if (!visible) return null;

  const emoji = mood === 'good' ? '💼' : mood === 'bad' ? '📉' : '🤷';

  return (
    <div style={{
      position: 'fixed', bottom: 80, right: 24, display: 'flex', alignItems: 'flex-end',
      gap: 12, animation: 'mascotSlideIn 0.3s ease-out', zIndex: 100
    }}>
      <div style={{
        background: '#1a1a1a', border: '1px solid #333', borderRadius: 12, padding: '12px 16px',
        maxWidth: 240, position: 'relative', marginBottom: 40
      }}>
        <div style={{ fontSize: 13, color: '#fff', lineHeight: 1.4, fontFamily: 'monospace', minHeight: 20 }}>
          {typed}<span style={{ opacity: typed.length < quote.length ? 1 : 0, animation: 'blink 0.5s infinite' }}>|</span>
        </div>
        <div style={{
          position: 'absolute', bottom: -8, right: 30, width: 0, height: 0,
          borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '8px solid #1a1a1a'
        }} />
      </div>
      <div style={{
        width: 70, height: 70, borderRadius: 12, background: '#222', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: 40,
        animation: mood === 'good' ? 'bounce 0.5s ease' : mood === 'bad' ? 'shake 0.5s ease' : 'fade 0.3s ease'
      }}>
        {emoji}
      </div>
      <style>{`
        @keyframes mascotSlideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        @keyframes fade { from { opacity: 0.5; } to { opacity: 1; } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}

export default function LinkedInSchool() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [animating, setAnimating] = useState<'left' | 'right' | null>(null);
  const [reviewed, setReviewed] = useState<Comment[]>([]);
  const [viewingHistory, setViewingHistory] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [mascotVisible, setMascotVisible] = useState(false);
  const [mascotMood, setMascotMood] = useState('good');
  const [mascotQuote, setMascotQuote] = useState('');
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [promptText, setPromptText] = useState('');

  useEffect(() => { fetchComments(); }, []);
  useEffect(() => {
    if (comments[currentIndex]) setNote(comments[currentIndex].school_comment || '');
  }, [currentIndex, comments]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (viewingHistory || currentIndex >= comments.length) return;
      if (e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'g' || e.key === 'G') handleAction('good');
      else if (e.key === 'b' || e.key === 'B') handleAction('bad');
      else if (e.key === 's' || e.key === 'S') handleAction('skip');
      else if (e.key === 'ArrowLeft' && reviewed.length > 0) { setViewingHistory(true); setHistoryIndex(reviewed.length - 1); }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentIndex, comments, viewingHistory, reviewed, note]);

  async function fetchComments() {
    setLoading(true);
    const res = await fetch('/api/linkedin-reply-guy/school?filter=unreviewed&limit=100');
    const data = await res.json();
    setComments(data.comments || []);
    setLoading(false);
  }

  async function handleAction(rating: 'good' | 'bad' | 'skip') {
    const current = comments[currentIndex];
    if (!current) return;
    setAnimating(rating === 'good' ? 'right' : 'left');
    setMascotVisible(false);

    const quotes = rating === 'good' ? GOOD_QUOTES : rating === 'bad' ? BAD_QUOTES : SKIP_QUOTES;
    setTimeout(() => {
      setMascotMood(rating);
      setMascotQuote(quotes[Math.floor(Math.random() * quotes.length)]);
      setMascotVisible(true);
    }, 150);

    await fetch('/api/linkedin-reply-guy/school', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: current.id, rating, comment: note })
    });

    setTimeout(() => {
      setReviewed(prev => [...prev, { ...current, school_rating: rating, school_comment: note }]);
      setCurrentIndex(prev => prev + 1);
      setNote('');
      setAnimating(null);
    }, 300);
  }

  async function copyPrompt() {
    const res = await fetch('/api/linkedin-reply-guy/school/prompt');
    const data = await res.json();
    await navigator.clipboard.writeText(data.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function previewPrompt() {
    const res = await fetch('/api/linkedin-reply-guy/school/prompt');
    const data = await res.json();
    setPromptText(data.prompt || '');
    setShowPromptPreview(true);
  }

  const current = viewingHistory ? reviewed[historyIndex] : comments[currentIndex];
  const isFinished = !viewingHistory && currentIndex >= comments.length;

  return (
    <div style={{ background: '#000', color: '#fff', minHeight: '100vh', fontFamily: 'system-ui' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #222' }}>
        <a href="/linkedin-reply-guy" style={{ color: '#666', textDecoration: 'none', fontSize: 13 }}>Back</a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/>
          </svg>
          <span style={{ fontSize: 14, fontWeight: 500 }}>Comment School</span>
          <span style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>
            {viewingHistory ? `${historyIndex + 1}/${reviewed.length}` : `${currentIndex + 1}/${comments.length}`}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={previewPrompt} style={{ background: 'none', color: '#666', border: '1px solid #333', padding: '6px 10px', borderRadius: 4, cursor: 'pointer' }} title="Preview Prompt">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
          <button onClick={copyPrompt} style={{ background: 'none', color: copied ? '#fff' : '#666', border: '1px solid #333', padding: '6px 12px', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>
            {copied ? 'Copied' : 'Copy Prompt'}
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 120px)', padding: '20px', position: 'relative' }}>
        <button onClick={() => {
          if (viewingHistory && historyIndex > 0) setHistoryIndex(prev => prev - 1);
          else if (!viewingHistory && reviewed.length > 0) { setViewingHistory(true); setHistoryIndex(reviewed.length - 1); }
        }} style={{ position: 'absolute', left: 20, background: 'none', border: 'none', color: reviewed.length === 0 && !viewingHistory ? '#222' : '#555', fontSize: 28, cursor: 'pointer' }}>
          &larr;
        </button>

        {loading ? (
          <div style={{ color: '#444' }}>Loading...</div>
        ) : isFinished ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💼</div>
            <div style={{ fontSize: 24, marginBottom: 8 }}>Session Complete</div>
            <div style={{ color: '#666', marginBottom: 24 }}>{reviewed.length} comments reviewed</div>
            <button onClick={copyPrompt} style={{ background: '#fff', color: '#000', border: 'none', padding: '12px 24px', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}>
              {copied ? 'Copied' : 'Copy Training Prompt'}
            </button>
          </div>
        ) : current ? (
          <div key={current.id} style={{
            width: '100%', maxWidth: 550,
            transform: animating === 'left' ? 'translateX(-100%) rotate(-5deg)' : animating === 'right' ? 'translateX(100%) rotate(5deg)' : 'none',
            opacity: animating ? 0 : 1, transition: 'all 0.25s ease'
          }}>
            {/* Our Comment */}
            <div style={{ background: '#111', border: '1px solid #333', borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#555', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                <span>Our Comment</span>
                {current.post_url && (
                  <a href={current.post_url} target="_blank" rel="noopener noreferrer" style={{ color: '#555', textDecoration: 'none' }}>View on LinkedIn</a>
                )}
              </div>
              <div style={{ fontSize: 16, lineHeight: 1.4, color: '#fff' }}>{current.comment_text}</div>
              <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: '#666' }}>
                <span>{(current.impressions || 0).toLocaleString()} impressions</span>
                <span>{current.strategy || '-'}</span>
              </div>
            </div>

            {/* Original Post Context */}
            {current.post_text && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: '#444', marginBottom: 6 }}>Original post by {current.post_author || 'unknown'}:</div>
                <div style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 13, color: '#888', lineHeight: 1.4 }}>
                    {current.post_text.slice(0, 300)}{current.post_text.length > 300 ? '...' : ''}
                  </div>
                </div>
              </div>
            )}

            {!viewingHistory && (
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note..."
                style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: 8, padding: 12, color: '#fff', fontSize: 14, resize: 'none', height: 50, marginBottom: 12, boxSizing: 'border-box' }}
              />
            )}

            {!viewingHistory ? (
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => handleAction('bad')} style={{ flex: 1, padding: 14, background: 'none', color: '#fff', border: '1px solid #333', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>Bad</button>
                <button onClick={() => handleAction('skip')} style={{ padding: '14px 20px', background: 'none', color: '#555', border: '1px solid #222', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>Skip</button>
                <button onClick={() => handleAction('good')} style={{ flex: 1, padding: 14, background: '#fff', color: '#000', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>Good</button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#666', fontSize: 13, padding: 12, border: '1px solid #333', borderRadius: 8 }}>
                {current.school_rating}{current.school_comment && `: ${current.school_comment}`}
              </div>
            )}
          </div>
        ) : null}

        <button onClick={() => {
          if (viewingHistory) { if (historyIndex < reviewed.length - 1) setHistoryIndex(prev => prev + 1); else setViewingHistory(false); }
        }} style={{ position: 'absolute', right: 20, background: 'none', border: 'none', color: !viewingHistory ? '#222' : '#555', fontSize: 28, cursor: 'pointer' }}>
          &rarr;
        </button>
      </div>

      <Mascot mood={mascotMood} quote={mascotQuote} visible={mascotVisible} />

      {/* Footer */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 24px', borderTop: '1px solid #222', background: '#000', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#333' }}>G = good, B = bad, S = skip</span>
        {(reviewed.length > 0 || viewingHistory) && (
          <button onClick={() => { if (viewingHistory) setViewingHistory(false); else { setViewingHistory(true); setHistoryIndex(0); } }} style={{
            background: viewingHistory ? '#333' : 'transparent', color: viewingHistory ? '#fff' : '#666',
            border: '1px solid #333', padding: '6px 12px', borderRadius: 4, fontSize: 12, cursor: 'pointer'
          }}>
            {viewingHistory ? 'Back to review' : `Reviewed (${reviewed.length})`}
          </button>
        )}
      </div>

      {/* Prompt Preview Modal */}
      {showPromptPreview && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setShowPromptPreview(false)}>
          <div style={{ background: '#111', borderRadius: 12, padding: 24, maxWidth: 800, maxHeight: '80vh', overflow: 'auto', position: 'relative', width: '100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Training Prompt Preview</h3>
              <button onClick={() => setShowPromptPreview(false)} style={{ background: 'none', border: 'none', color: '#666', fontSize: 20, cursor: 'pointer' }}>x</button>
            </div>
            <pre style={{ background: '#0a0a0a', padding: 16, borderRadius: 8, fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: '#ccc', margin: 0, fontFamily: 'monospace' }}>
              {promptText || 'Loading...'}
            </pre>
            <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPromptPreview(false)} style={{ background: '#333', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 6, cursor: 'pointer' }}>Close</button>
              <button onClick={() => { navigator.clipboard.writeText(promptText); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ background: '#fff', color: '#000', border: 'none', padding: '10px 20px', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
