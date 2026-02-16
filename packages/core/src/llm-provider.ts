/**
 * LLM provider configuration. OpenRouter and OpenAI are optional; one must be configured.
 *
 * To add a new provider:
 * 1. Add its id to LLMProviderId and to PROVIDER_ENV (key + baseURL if different from OpenAI).
 * 2. In getLLMClientConfig(), handle the new id in the explicit and fallback logic.
 * 3. Add env vars to .env.example and Vision settings API if you want UI support.
 * Providers using the OpenAI-compatible API (same request/response shape) work with the existing client.
 */
export type LLMProviderId = 'openrouter' | 'openai';

export interface LLMClientConfig {
  apiKey: string;
  baseURL?: string;
  defaultHeaders?: Record<string, string>;
  provider: LLMProviderId;
}

const PROVIDER_ENV: Record<LLMProviderId, { key: string; baseURL?: string }> = {
  openrouter: {
    key: 'OPENROUTER_API_KEY',
    baseURL: 'https://openrouter.ai/api/v1',
  },
  openai: {
    key: 'OPENAI_API_KEY',
    baseURL: undefined, // use default api.openai.com
  },
};

/**
 * Resolves which provider to use from env:
 * - LLM_PROVIDER=openrouter | openai forces that provider (must have corresponding key).
 * - If unset: use openrouter if OPENROUTER_API_KEY set, else openai if OPENAI_API_KEY set.
 */
export function getLLMClientConfig(): LLMClientConfig {
  const explicit = (process.env.LLM_PROVIDER ?? '').toLowerCase();
  let provider: LLMProviderId | null = null;

  if (explicit === 'openrouter' || explicit === 'openai') {
    provider = explicit;
  } else {
    if (process.env.OPENROUTER_API_KEY?.trim()) provider = 'openrouter';
    else if (process.env.OPENAI_API_KEY?.trim()) provider = 'openai';
  }

  if (!provider) {
    throw new Error(
      'No LLM provider configured. Set LLM_PROVIDER=openrouter and OPENROUTER_API_KEY, or LLM_PROVIDER=openai and OPENAI_API_KEY.'
    );
  }

  const envKey = PROVIDER_ENV[provider].key;
  const apiKey = process.env[envKey]?.trim();
  if (!apiKey) {
    throw new Error(
      `LLM_PROVIDER=${provider} requires ${envKey} to be set.`
    );
  }

  const baseURL = PROVIDER_ENV[provider].baseURL;
  const config: LLMClientConfig = {
    apiKey,
    provider,
  };
  if (baseURL) config.baseURL = baseURL;
  if (provider === 'openrouter') {
    config.defaultHeaders = {
      'HTTP-Referer': process.env.LLM_HTTP_REFERER ?? 'https://github.com/IronValleyLabs/jellyfish',
      'X-Title': process.env.LLM_X_TITLE ?? 'Jellyfish AI Agent',
    };
  }
  return config;
}
