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

const USER_ID = 'user_001'; 

export default function Home() {
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [state, setState]         = useState<State>('neutral');
  const [memOpen, setMemOpen]     = useState(false);
  const [memory, setMemory]       = useState<{ summary: string; patterns: string[] } | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

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
      const res = await fetch('/', { 
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
        text: 'Ошибка отправки запроса.',
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
        gap: 16,
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
            gap: 4,
            padding: '12px 16px',
            color: '#71717a',
            fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace"
          }}>
            <span>typing...</span>
          </div>
        )}
        
        <div ref={bottomRef} />
      </div>

      {/* ── Input Box ───────────────────────────────────────────────────────── */}
      <div style={{
        padding: '0 24px 24px',
        background: 'transparent',
      }}>
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-end',
          background: '#141416',
          border: '1px solid #232326',
          borderRadius: 12,
          padding: '10px 14px',
        }}>
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type a message..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              resize: 'none',
              color: '#fafafa',
              fontSize: 14,
              outline: 'none',
              fontFamily: 'inherit',
              lineHeight: '20px',
              maxHeight: 140,
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            style={{
              background: '#fafafa',
              color: '#0a0a0a',
              border: 'none',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              opacity: input.trim() && !loading ? 1 : 0.4,
              transition: 'opacity 0.15s',
            }}
          >
            Send
          </button>
        </div>
      </div>
