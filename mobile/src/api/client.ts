import AsyncStorage from '@react-native-async-storage/async-storage';

export const BASE_URL = 'https://6540de83-9e93-48e6-ba5e-b3e8ccf7597b-00-ql02ls1780l3.kirk.replit.dev';

async function getHeaders(extra?: Record<string, string>) {
  const cookie = await AsyncStorage.getItem('session_cookie');
  return {
    'Content-Type': 'application/json',
    ...(cookie ? { Cookie: cookie } : {}),
    ...extra,
  };
}

export async function apiGet<T>(path: string): Promise<T> {
  const headers = await getHeaders();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers,
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown, extraHeaders?: Record<string, string>): Promise<T> {
  const headers = await getHeaders(extraHeaders);
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const headers = await getHeaders();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiDelete(path: string): Promise<void> {
  const headers = await getHeaders();
  await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers,
    credentials: 'include',
  });
}

export async function uploadImage(uri: string): Promise<{ url: string }> {
  const headers = await getHeaders();
  delete (headers as any)['Content-Type'];
  const form = new FormData();
  form.append('file', {
    uri,
    name: 'image.jpg',
    type: 'image/jpeg',
  } as any);
  const res = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers,
    body: form,
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

export async function streamChat(
  conversationId: number,
  content: string,
  imageUrl: string | null,
  pin: string | null,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void
) {
  const headers = await getHeaders(pin ? { 'X-Chat-Pin': pin } : undefined);
  const body = JSON.stringify({ content, imageUrl });

  const res = await fetch(`${BASE_URL}/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers,
    body,
    credentials: 'include',
  });

  if (!res.ok) {
    onError(`HTTP ${res.status}`);
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) { onDone(); return; }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) { onDone(); break; }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') { onDone(); return; }
        try {
          const parsed = JSON.parse(data);
          if (parsed.content) onChunk(parsed.content);
        } catch { }
      }
    }
  }
}
