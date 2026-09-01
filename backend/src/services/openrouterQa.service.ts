import { fetch, ProxyAgent, type Dispatcher } from 'undici';
import { config } from '../config/env.js';
import { charCount, extractOpenRouterText, fitToMaxChars } from '../utils/qaText.js';

type ChatTurn = { role: 'system' | 'user' | 'assistant'; content: string };

const isSecurityBlock = (status: number, body: string) => {
  if (status !== 403) return false;
  const lower = body.toLowerCase();
  return lower.includes('access denied by security policy') || lower.includes('security policy');
};

const uniqueModels = (): string[] => {
  const primary = config.openrouter.model;
  const rest = config.openrouter.fallbackModels.filter(model => model && model !== primary);
  return [primary, ...rest];
};

export class OpenRouterUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenRouterUnavailableError';
  }
}

export class OpenRouterQaService {
  private dispatcher(): Dispatcher | undefined {
    const proxy = config.openrouter.httpProxy;
    if (!proxy) return undefined;
    return new ProxyAgent(proxy);
  }

  async complete(messages: ChatTurn[], maxChars: number): Promise<string> {
    if (!config.openrouter.apiKey) {
      throw new OpenRouterUnavailableError('OpenRouter API key is not configured');
    }

    const models = uniqueModels();
    const overallDeadline = Date.now() + Math.max(30_000, config.openrouter.timeoutMs);
    let securityBlock = false;
    let lastError = 'Модель не ответила';

    for (let i = 0; i < models.length; i += 1) {
      const remaining = overallDeadline - Date.now();
      if (remaining < 5_000) {
        lastError = 'Истекло общее время ожидания ответа модели';
        break;
      }

      const timeoutMs = Math.min(Math.max(20_000, config.openrouter.perModelTimeoutMs), remaining);
      const model = models[i];
      console.log(`[qa] OpenRouter attempt ${i + 1}/${models.length}: ${model} (${timeoutMs}ms)`);

      try {
        const text = await this.tryModel(model, messages, maxChars, timeoutMs);
        if (text) {
          console.log(`[qa] OpenRouter ok: ${model}`);
          return fitToMaxChars(text, maxChars);
        }
        lastError = `Пустой ответ модели ${model}`;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        lastError = message;
        console.warn(`[qa] OpenRouter ${model} failed: ${message.slice(0, 180)}`);
        if (message.includes('security policy')) {
          securityBlock = true;
          break;
        }
      }
    }

    if (securityBlock) {
      throw new OpenRouterUnavailableError(
        'OpenRouter отклонил запрос по политике безопасности (часто IP РФ). Задайте OPENROUTER_HTTP_PROXY.'
      );
    }

    throw new OpenRouterUnavailableError(lastError);
  }

  private async tryModel(
    model: string,
    messages: ChatTurn[],
    maxChars: number,
    timeoutMs: number
  ): Promise<string | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const maxTokens = Math.min(2000, Math.max(256, Math.ceil(maxChars * 1.15) + 64));

    try {
      const response = await fetch(`${config.openrouter.baseUrl}/chat/completions`, {
        method: 'POST',
        dispatcher: this.dispatcher(),
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${config.openrouter.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://alexol.io',
          'X-Title': 'Alexol Q&A',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          max_tokens: maxTokens,
        }),
      });

      const rawBody = await response.text();
      if (response.status === 200) {
        let payload: unknown = {};
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return null;
        }
        const text = extractOpenRouterText(payload);
        if (!text || charCount(text) < 2) return null;
        return text;
      }

      if (isSecurityBlock(response.status, rawBody)) {
        throw new Error('OpenRouter security policy');
      }

      if (response.status === 401 || response.status === 402) {
        throw new Error(response.status === 401 ? 'Неверный ключ OpenRouter' : 'Недостаточно кредитов OpenRouter');
      }

      console.warn(`[qa] HTTP ${response.status}: ${rawBody.slice(0, 160)}`);
      return null;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Таймаут ${model} (${Math.round(timeoutMs / 1000)}с), пробуем другую модель`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
