const API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// Calls Claude with a single forced tool call and returns the tool's
// parsed `input` object — i.e. reliable structured output without having
// to parse JSON out of free-form text.
export async function callClaudeForStructuredOutput({
  model = 'claude-sonnet-5',
  system,
  userMessage,
  tool,
  maxTokens = 4096,
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Add it to a local .env file (see .env.example) or export it in your shell.',
    );
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMessage }],
      tools: [tool],
      tool_choice: { type: 'tool', name: tool.name },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Claude API request failed: ${res.status} ${errBody}`);
  }

  const data = await res.json();
  const toolUse = data.content?.find((block) => block.type === 'tool_use' && block.name === tool.name);
  if (!toolUse) {
    throw new Error(`Claude did not return a ${tool.name} tool call. Raw response: ${JSON.stringify(data)}`);
  }
  return toolUse.input;
}
