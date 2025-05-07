import axios from 'axios';

let API_KEY = process.env.REACT_APP_OPENAI_API_KEY || window.localStorage.getItem('openai_api_key');
const DEFAULT_MODEL = 'o4-mini';

/**
 * Send chat messages to OpenAI Completions API using o4-mini or specified model.
 * @param {Array<{role: string, content: string}>} messages
 * @param {string} model
 * @returns {Promise<{role: string, content: string}>}
 */
export async function sendMessage(messages, model = DEFAULT_MODEL) {
  if (!API_KEY) {
    throw new Error('OpenAI API key not found. Please set REACT_APP_OPENAI_API_KEY');
  }
  const payload = { model, messages };
  try {
    const res = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`
      }
    });
    const choice = res.data.choices && res.data.choices[0];
    if (choice && choice.message) {
      return choice.message;
    }
    throw new Error('No response from OpenAI');
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    throw new Error(`OpenAI error: ${msg}`);
  }
}

/**
 * Set OpenAI API key at runtime.
 * Stores key in localStorage and updates internal variable.
 */
export function setApiKey(key) {
  window.localStorage.setItem('openai_api_key', key);
  API_KEY = key;
}
