type Memory = {
  summary: string;
  patterns: string[];
  messageCount: number;
};

const store: Record<string, Memory> = {};

export function getMemory(userId: string): Memory {
  return store[userId] || {
    summary: '',
    patterns: [],
    messageCount: 0,
  };
}

export function saveMemory(memory: Memory & { userId?: string }) {
  if (!memory) return;
}

export function detectState(text: string) {
  return 'neutral';
}

export function compressMemory() {
  return;
}