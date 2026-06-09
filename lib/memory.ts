type Memory = {
  summary: string;
  patterns: string[];
  messageCount: number;
};

const store: Record<string, Memory> = {};

export function getMemory(userId: string): Memory {
  if (!store[userId]) {
    store[userId] = {
      summary: '',
      patterns: [],
      messageCount: 0,
    };
  }
  return store[userId];
}

export function saveMemory(data: Memory & { userId?: string }) {
  if (!data) return;
  const { userId = 'default', ...memory } = data;
  store[userId] = memory;
}

export function detectState(text: string) {
  const t = text.toLowerCase();

  if (t.includes('страх') || t.includes('трев')) return 'anxious';
  if (t.includes('подума') || t.includes('анализ')) return 'reflective';
  if (t.includes('спокой') || t.includes('норм')) return 'calm';

  return 'neutral';
}

export async function compressMemory() {
  // пока заглушка (можно позже подключить AI)
  return;
}