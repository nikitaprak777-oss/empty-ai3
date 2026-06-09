export interface MemoryRecord {
  userId: string;
  summary: string;       
  patterns: string[];    
  messageCount: number;  
  updatedAt: Date;
}

export type ConversationState = 'calm' | 'anxious' | 'reflective' | 'neutral';

const g = globalThis as typeof globalThis & { __memoryStore?: Map<string, MemoryRecord> };
if (!g.__memoryStore) g.__memoryStore = new Map();
const store = g.__memoryStore;

export function getMemory(userId: string): MemoryRecord {
  return store.get(userId) ?? {
    userId,
    summary: '',
    patterns: [],
    messageCount: 0,
    updatedAt: new Date(),
  };
}

export function saveMemory(record: MemoryRecord): void {
  store.set(record.userId, { ...record, updatedAt: new Date() });
}

const ANXIOUS_WORDS  = /\b(anxious|panic|scared|worried|stress|overwhelm|can't|cannot|help|urgent|please)\b/i;
const REFLECTIVE_WORDS = /\b(think|wonder|maybe|perhaps|realize|understand|meaning|why|how come|feel like)\b/i;
const CALM_WORDS     = /\b(good|fine|okay|great|well|calm|happy|nice|enjoying|peaceful)\b/i;

export function detectState(message: string): ConversationState {
  if (ANXIOUS_WORDS.test(message))   return 'anxious';
  if (REFLECTIVE_WORDS.test(message)) return 'reflective';
  if (CALM_WORDS.test(message))       return 'calm';
  return 'neutral';
}

export async function compressMemory(
  userId: string,
  recentMessages: { role: 'user' | 'assistant'; content: string }[],
  apiKey: string,
): Promise<void> {
  const existing = getMemory(userId);

  const prompt = `You are a memory compressor. Given an existing memory summary and new conversation messages, produce a COMPRESSED update.

EXISTING SUMMARY:
${existing.summary || '(none)'}

EXISTING PATTERNS:
${existing.patterns.join(', ') || '(none)'}

NEW MESSAGES:
${recentMessages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}

Return ONLY valid JSON, no prose and no markdown code blocks:
{
  "summary": "2-3 sentence compressed facts about this user",
  "patterns": ["pattern1", "pattern2"]
}`;

  try {
    const res = await fetch(`https://googleapis.com{apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      }),
    });

    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    const parsed = JSON.parse(raw.trim());

    saveMemory({
      userId,
      summary: parsed.summary ?? existing.summary,
      patterns: parsed.patterns ?? existing.patterns,
      messageCount: 0,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error("Gemini memory compression failed:", error);
  }
}
