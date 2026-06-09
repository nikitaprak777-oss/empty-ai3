'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

type Role = 'user' | 'ai';
type State = 'calm' | 'anxious' | 'reflective' | 'neutral';

interface Message {
  id: string;
  role: Role;
  text: string;
  state?: State;
  ts: number;
}

const STATE_COLORS: Record<State, string> = {
  calm:       '#34d399',
  anxious:    '#f87171',
  reflective: '#a78bfa',
  neutral:    '#71717a',
};

const STATE_LABELS: Record<State, string> = {
  calm:       'calm',
  anxious:    'anxious',
  reflective: 'reflective',
  neutral:    'neutral',
};

const USER_ID = 'user_001'; // hardcoded for MVP; extend with auth later

export default function Home() {
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [state, setState]         = useState<State>('neutral');
  const [memOpen, setMemOpen]     = useState(false);
  const [memory, setMemory]       = useState<{ summary: string; patterns: string[] } | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }, [input]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
      ts: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, userId: USER_ID }),
      });

      const data = await res.json();
      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: 'ai',
        text: data.text ?? '...',
        state: data.state,
        ts: Date.now(),
      };

      setMessages(prev => [...prev, aiMsg]);
      if (data.state) setState(data.state);
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'ai',
        text: '...',
        ts: Date.now(),
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, loading]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const loadMemory = async () => {
    try {
      const res = await fetch(`/api/memory?userId=${USER_ID}`);
      const data = await res.json();
      setMemory({ summary: data.summary || '(none)', patterns: data.patterns || [] });
    } catch {
      setMemory({ summary: 'error loading memory', patterns: [] });
    }
  };

  const clearMemory = async () => {
    await fetch(`/api/memory?userId=${USER_ID}`, { method: 'DELETE' });
    setMemory({ summary: '(cleared)', patterns: [] });
  };

  const toggleMem = () => {
    if (!memOpen) loadMemory();
    setMemOpen(v => !v);
  };

  const stateColor = STATE_COLORS[state];

  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100dvh',
      maxWidth: 680,
      margin: '0 auto',
      position: 'relative',
    }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '18px 24px 16px',
        borderBottom: '1px solid #1c1c1f',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 15,
            fontWeight: 500,
            letterSpacing: '0.12em',
            color: '#fafafa',
          }}>
            EMPTY
          </span>
          {/* State dot */}
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 11,
            color: stateColor,
            fontFamily: "'JetBrains Mono', monospace",
            opacity: 0.8,
            transition: 'color 0.4s ease',
          }}>
            <span style={{
              width: 5, height: 5,
              borderRadius: '50%',
              background: stateColor,
              display: 'inline-block',
              boxShadow: `0 0 6px ${stateColor}`,
            }} />
            {STATE_LABELS[state]}
          </span>
        </div>

        <button
          onClick={toggleMem}
          style={{
            background: memOpen ? '#27272a' : 'transparent',
            border: '1px solid #27272a',
            color: '#71717a',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
            cursor: 'pointer',
            letterSpacing: '0.06em',
            transition: 'all 0.15s',
          }}
        >
          memory
        </button>
      </header>

      {/* ── Memory Panel ────────────────────────────────────────────────────── */}
      {memOpen && (
        <div style={{
          background: '#111113',
          borderBottom: '1px solid #1c1c1f',
          padding: '14px 24px',
          fontSize: 12,
          color: '#71717a',
          fontFamily: "'JetBrains Mono', monospace",
          flexShrink: 0,
        }}>
          {memory ? (
            <>
              <div style={{ marginBottom: 6 }}>
                <span style={{ color: '#52525b', marginRight: 8 }}>summary</span>
                {memory.summary}
              </div>
              {memory.patterns.length > 0 && (
                <div>
                  <span style={{ color: '#52525b', marginRight: 8 }}>patterns</span>
                  {memory.patterns.join(' · ')}
                </div>
              )}
              <button
                onClick={clearMemory}
                style={{
                  marginTop: 10,
                  background: 'transparent',
                  border: '1px solid #27272a',
                  color: '#52525b',
                  borderRadius: 4,
                  padding: '3px 8px',
                  fontSize: 10,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  letterSpacing: '0.06em',
                }}
              >
                clear memory
              </button>
            </>
          ) : (
            <span style={{ opacity: 0.5 }}>loading...</span>
          )}
        </div>
      )}

      {/* ── Messages ────────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 24px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}>

        {/* Empty state */}
        {messages.length === 0 && (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 8,
            opacity: 0.25,
            userSelect: 'none',
          }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 28,
              fontWeight: 300,
              letterSpacing: '0.2em',
              color: '#fafafa',
            }}>
              EMPTY
            </span>
            <span style={{ fontSize: 12, color: '#71717a' }}>say something.</span>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '10px 0 4px',
          }}>
            <TypingDots />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ───────────────────────────────────────────────────────────── */}
      <div style={{
        padding: '12px 16px 20px',
        borderTop: '1px solid #1c1c1f',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
          background: '#111113',
          border: '1px solid #27272a',
          borderRadius: 14,
          padding: '10px 12px',
          transition: 'border-color 0.15s',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="say something..."
            rows={1}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#fafafa',
              fontSize: 14,
              lineHeight: 1.5,
              resize: 'none',
              fontFamily: "'Inter', sans-serif",
              caretColor: '#a78bfa',
              maxHeight: 140,
              overflowY: 'auto',
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            style={{
              flexShrink: 0,
              width: 32,
              height: 32,
              borderRadius: 8,
              background: input.trim() && !loading ? '#a78bfa' : '#27272a',
              border: 'none',
              cursor: input.trim() && !loading ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s',
              marginBottom: 1,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <div style={{
          textAlign: 'center',
          marginTop: 8,
          fontSize: 10,
          color: '#3f3f46',
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.06em',
        }}>
          shift+enter for newline
        </div>
      </div>
    </main>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 2,
    }}>
      <div style={{
        maxWidth: '78%',
        padding: isUser ? '9px 14px' : '9px 0',
        borderRadius: isUser ? 14 : 0,
        background: isUser ? '#1e1b2e' : 'transparent',
        color: isUser ? '#e8e8f0' : '#a1a1aa',
        fontSize: 14,
        lineHeight: 1.55,
        fontWeight: isUser ? 400 : 300,
        border: isUser ? '1px solid #2d2a42' : 'none',
        fontFamily: isUser ? "'Inter', sans-serif" : "'Inter', sans-serif",
        letterSpacing: isUser ? 'normal' : '0.01em',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {message.text}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, paddingLeft: 2 }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: '#3f3f46',
            display: 'inline-block',
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
