/**
 * ai.service.js
 * LLM client — supports Groq (gsk_ key) and OpenAI (sk- key) transparently.
 */
const { OpenAI } = require('openai');

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const GROQ_MODEL   = 'llama-3.3-70b-versatile';
const OPENAI_MODEL = 'gpt-4o-mini';

function buildClient() {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) throw new Error('AI_API_KEY is not set');

  const isGroq = apiKey.startsWith('gsk_');
  return new OpenAI({
    apiKey,
    ...(isGroq ? { baseURL: GROQ_BASE_URL } : {}),
  });
}

function getModel() {
  const apiKey = process.env.AI_API_KEY || '';
  return apiKey.startsWith('gsk_') ? GROQ_MODEL : OPENAI_MODEL;
}

/**
 * Returns structured JSON: { parsedJson: Recommendation[], textExplanation: string }
 */
exports.getAIStrategy = async (systemPrompt, userDataJSON) => {
  try {
    const client = buildClient();
    const response = await client.chat.completions.create({
      model: getModel(),
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Portfolio data: ${JSON.stringify(userDataJSON)}. Return only valid JSON with "explanation" (string) and "recommendations" (array).`,
        },
      ],
    });

    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content);

    return {
      parsedJson: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      textExplanation: parsed.explanation || '',
    };
  } catch (err) {
    console.error('AI strategy error:', err.message);
    return { parsedJson: [], textExplanation: `AI unavailable: ${err.message}` };
  }
};

/**
 * Returns plain-text explanation string.
 */
exports.getAIText = async (systemPrompt, userDataJSON) => {
  try {
    const client = buildClient();
    const response = await client.chat.completions.create({
      model: getModel(),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(userDataJSON) },
      ],
    });
    return response.choices[0].message.content;
  } catch (err) {
    console.error('AI text error:', err.message);
    return `AI unavailable: ${err.message}`;
  }
};
