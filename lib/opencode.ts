const ENDPOINT = 'https://opencode.ai/zen/v1/chat/completions';

type Part =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

type Message = { role: 'user' | 'system' | 'assistant'; content: string | Part[] };

export async function chat(params: {
  model: string;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const key = process.env.OPENCODE_API_KEY;
  if (!key) throw new Error('OPENCODE_API_KEY not set');

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.4,
      max_tokens: params.maxTokens ?? 1024,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenCode ${res.status}: ${body.slice(0, 400)}`);
  }

  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content;
  if (typeof text !== 'string') throw new Error('OpenCode: no text in response');
  return text;
}
