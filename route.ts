import { NextRequest, NextResponse } from 'next/server';
import {
  getMemory,
  saveMemory,
  detectState,
  compressMemory,
} from './lib/memory'; // ИСПРАВЛЕНО: импорт из соседней папки lib
import { EMPTY_SYSTEM_PROMPT } from './lib/systemPrompt'; // ИСПРАВЛЕНО: импорт из соседней папки lib

const COMPRESS_EVERY = 6; 

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 500 });
  }

  const body = await req.json();
  const { message, userId = 'default' } = body as { message: string; userId?: string };

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Empty message' }, { status: 400 });
  }

  const memory = getMemory(userId);
  const state = detectState(message);

  const memoryBlock = memory.summary
    ? `MEMORY: ${memory.summary}\nPATTERNS: ${memory.patterns.join(', ')}`
    : 'MEMORY: (none yet)';

  const userContent = `${memoryBlock}
STATE: ${state}
MESSAGE: ${message}`;

  let aiText = '...';

  try {
    const response = await fetch('https://anthropic.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-20240307',
        max_tokens: 150,
        system: EMPTY_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    const data = await response.json();
    const raw = data?.content?.[0]?.text ?? '{"text":"..."}';
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    aiText = parsed.text ?? '...';
  } catch {
    aiText = '...';
  }

  const updatedCount = memory.messageCount + 1;

  if (updatedCount >= COMPRESS_EVERY) {
    const geminiKey = process.env.GEMINI_API_KEY || '';

    compressMemory(
      userId,
      [
        { role: 'user', content: message },
        { role: 'assistant', content: aiText },
      ],
      geminiKey, 
    );
  } else {
    saveMemory({ ...memory, messageCount: updatedCount });
  }

  return NextResponse.json({ text: aiText, state });
}
