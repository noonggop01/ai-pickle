// Free, no-signup image generation via Pollinations.ai (Flux-family models).
// Quality/uptime isn't guaranteed the way a paid API is — swap this out for
// Replicate/OpenAI/Stability once there's budget for it. Everything else in
// Agent 3 is written against this one function, so that swap is a one-file change.

const BASE_URL = 'https://image.pollinations.ai/prompt';

export async function generateImageBuffer(prompt, { width = 1200, height = 630, seed } = {}) {
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    nologo: 'true',
  });
  if (seed !== undefined) params.set('seed', String(seed));

  const url = `${BASE_URL}/${encodeURIComponent(prompt)}?${params.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Image generation failed (${res.status}) for prompt: "${prompt}"`);
  }
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/')) {
    const text = await res.text().catch(() => '');
    throw new Error(`Image endpoint did not return an image (content-type: ${contentType}). Body: ${text.slice(0, 200)}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const extension = EXTENSION_BY_CONTENT_TYPE[contentType.split(';')[0].trim()] ?? 'jpg';
  return { buffer, extension };
}

const EXTENSION_BY_CONTENT_TYPE = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
