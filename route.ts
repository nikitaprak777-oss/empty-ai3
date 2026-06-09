import { NextRequest, NextResponse } from 'next/server';
import {
  getMemory,
  saveMemory,
  detectState,
  compressMemory,
} from './lib/memory'; 
import { EMPTY_SYSTEM_PROMPT } from './lib/systemPrompt'; 

const COMPRESS_EVERY = 6; // Сжимать память каждые 6 сообщений

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

  // ── Загрузка памяти и определение состояния пользователя ───────────────────
  const memory = getMemory(userId);
  const state = detectState(message);

  // ── Формирование контекста памяти для Claude ───────────────────────────────
  const memoryBlock = memory.summary
    ? `MEMORY: ${memory.summary}\nPATTERNS: ${memory.patterns.join(', ')}`
    : 'MEMORY: (none yet)';

  const userContent = `${memoryBlock}
STATE: ${state}
MESSAGE: ${message}`;

  // ── Запрос к модели Claude ──────────────────────────────────────────────────
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
    
    // ИСПРАВЛЕНО: Убрана синтаксическая ошибка с двойными точками `?.?.`
    const raw = data?.content?.[0]?.text ?? '{"text":"..."}';
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    aiText = parsed.text ?? '...';
  } catch {
    aiText = '...';
  }

  // ── Обновление счетчика сообщений и вызов сжатия памяти ────────────────────
  const updatedCount = memory.messageCount + 1;

  if (updatedCount >= COMPRESS_EVERY) {
    // Получаем ключ Gemini конкретно для фонового сжатия памяти
    const geminiKey = process.env.GEMINI_API_KEY || '';

    // Запуск процесса сжатия
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
