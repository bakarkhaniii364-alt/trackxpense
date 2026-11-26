/**
 * GroqClient Service
 * Client-side interface for AI completions.
 * Routes requests through Supabase Edge Function 'ai-proxy' (or dev-only loopback middleware)
 * so server API credentials are never bundled into frontend JavaScript.
 * Direct browser requests occur ONLY when a visitor explicitly supplies their own personal BYOK key.
 */

import { supabase } from './supabase';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | any[];
}

export interface GroqCompletionOptions {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  response_format?: { type: string };
  customApiKey?: string;
}

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const commaIdx = result.indexOf(',');
      resolve(commaIdx !== -1 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

export const GroqClient = {
  /**
   * Execute chat completion via the secure backend proxy (with candidate model fallback),
   * trying personal BYOK key first only if supplied in localStorage/settings.
   */
  async complete(options: GroqCompletionOptions): Promise<string | null> {
    const { model, messages, temperature = 0.1, response_format, customApiKey } = options;
    const isVisionRequest = messages.some(m => Array.isArray(m.content));
    const defaultModel = isVisionRequest ? 'qwen/qwen3.6-27b' : 'openai/gpt-oss-120b';
    const effectiveModel = model || defaultModel;

    const candidateModels = isVisionRequest
      ? [effectiveModel, 'qwen/qwen3.6-27b', 'qwen/qwen3.8-27b'].filter((m, i, arr) => arr.indexOf(m) === i)
      : [effectiveModel, 'llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'qwen/qwen3.6-27b', 'openai/gpt-oss-20b'].filter((m, i, arr) => arr.indexOf(m) === i);

    const personalGroqKey = customApiKey?.trim() || localStorage.getItem('trackxpense_groq_api_key')?.trim() || '';
    const personalGeminiKey = localStorage.getItem('trackxpense_gemini_api_key')?.trim() || '';

    // 1. Personal BYOK Groq key path (visitor's own key in their own browser)
    if (personalGroqKey && (personalGroqKey.startsWith('gsk_') || !personalGeminiKey)) {
      for (const m of candidateModels) {
        try {
          const payload: Record<string, any> = { model: m, messages, temperature };
          if (response_format) payload.response_format = response_format;
          if (isVisionRequest) payload.max_tokens = 800;

          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${personalGroqKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          if (res.ok) {
            const json = await res.json();
            const raw = json?.choices?.[0]?.message?.content;
            if (raw) {
              const cleaned = GroqClient.cleanThinkTags(raw);
              if (cleaned) return cleaned;
            }
          }
        } catch {
          // Try next model or fall back to managed proxy below
        }
      }
    }

    // 2. Personal BYOK Gemini key path
    if (personalGeminiKey) {
      try {
        const systemMsg = messages.find(m => m.role === 'system');
        const userAndAssistantMsgs = messages.filter(m => m.role !== 'system');

        const geminiPayload: Record<string, any> = {
          contents: userAndAssistantMsgs.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }]
          }))
        };

        if (systemMsg) {
          geminiPayload.systemInstruction = {
            parts: [{ text: typeof systemMsg.content === 'string' ? systemMsg.content : JSON.stringify(systemMsg.content) }]
          };
        }

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${personalGeminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiPayload)
          }
        );

        if (res.ok) {
          const json = await res.json();
          const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (raw) return GroqClient.cleanThinkTags(raw);
        }
      } catch {
        // Fall through to managed backend proxy
      }
    }

    // 3. Managed Supabase Edge Function proxy (with candidate model fallback)
    for (const m of candidateModels) {
      try {
        const { data, error } = await supabase.functions.invoke('ai-proxy', {
          body: {
            model: m,
            messages,
            temperature,
            response_format,
            ...(isVisionRequest ? { max_tokens: 800 } : {})
          }
        });

        if (!error && data?.choices?.[0]?.message?.content) {
          const cleaned = GroqClient.cleanThinkTags(data.choices[0].message.content);
          if (cleaned) return cleaned;
        }
        // If unauthenticated/unavailable on Edge Function, stop retrying models against it
        if (error) break;
      } catch {
        break;
      }
    }

    // 4. Dev-only server middleware fallback (loopback only; never present in production builds)
    if (import.meta.env.DEV) {
      for (const m of candidateModels) {
        try {
          const res = await fetch('/__dev-ai-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: m,
              messages,
              temperature,
              response_format,
              ...(isVisionRequest ? { max_tokens: 800 } : {})
            })
          });
          if (res.ok) {
            const json = await res.json();
            const raw = json?.choices?.[0]?.message?.content;
            if (raw) {
              const cleaned = GroqClient.cleanThinkTags(raw);
              if (cleaned) return cleaned;
            }
          }
        } catch {
          // Try next model
        }
      }
    }

    return null;
  },

  /**
   * Strip <think>...</think> reasoning traces emitted by Qwen/DeepSeek models.
   * Also cleans unclosed <think>... blocks if response was truncated mid-thought.
   */
  cleanThinkTags(content: string): string {
    if (!content) return '';
    let cleaned = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    cleaned = cleaned.replace(/<think>[\s\S]*$/gi, '').trim();
    return cleaned;
  },

  /**
   * Extract JSON object or array from LLM response text (handles markdown fences).
   */
  extractJson<T = any>(content: string): T | null {
    if (!content) return null;
    const clean = GroqClient.cleanThinkTags(content);
    const fenceMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const target = fenceMatch ? fenceMatch[1].trim() : clean;

    try {
      return JSON.parse(target);
    } catch {
      const firstBrace = clean.indexOf('{');
      const lastBrace = clean.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        try {
          return JSON.parse(clean.substring(firstBrace, lastBrace + 1));
        } catch {}
      }

      const firstBracket = clean.indexOf('[');
      const lastBracket = clean.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket > firstBracket) {
        try {
          return JSON.parse(clean.substring(firstBracket, lastBracket + 1));
        } catch {}
      }
    }
    return null;
  },

  /**
   * Transcribe recorded audio with Groq Whisper via secure backend proxy,
   * using personal BYOK key first only if supplied by the visitor.
   */
  async transcribeAudio(audioBlob: Blob, customApiKey?: string): Promise<string | null> {
    const personalKey = (
      customApiKey?.trim() ||
      localStorage.getItem('trackxpense_groq_api_key')?.trim() ||
      ''
    );

    if (personalKey) {
      const models = ['whisper-large-v3-turbo', 'whisper-large-v3'];
      const ext = audioBlob.type.includes('mp4') ? 'mp4' : audioBlob.type.includes('ogg') ? 'ogg' : audioBlob.type.includes('wav') ? 'wav' : 'webm';

      for (const model of models) {
        try {
          const formData = new FormData();
          formData.append('file', audioBlob, `speech.${ext}`);
          formData.append('model', model);
          formData.append('response_format', 'json');

          const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${personalKey}`
            },
            body: formData
          });

          if (res.ok) {
            const data = await res.json();
            const text = data.text?.trim();
            if (text) return text;
          }
        } catch {
          // Fallback to proxy below
        }
      }
    }

    try {
      const audioBase64 = await blobToBase64(audioBlob);
      const mimeType = audioBlob.type || 'audio/webm';

      const { data, error } = await supabase.functions.invoke('ai-proxy', {
        body: {
          action: 'transcribe',
          model: 'whisper-large-v3-turbo',
          audioBase64,
          mimeType
        }
      });

      if (!error && data?.text?.trim()) {
        return data.text.trim();
      }

      if (import.meta.env.DEV) {
        const res = await fetch('/__dev-ai-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'transcribe',
            model: 'whisper-large-v3-turbo',
            audioBase64,
            mimeType
          })
        });
        if (res.ok) {
          const devData = await res.json();
          if (devData?.text?.trim()) return devData.text.trim();
        }
      }
    } catch {
      // Proxy transcription unavailable
    }

    return null;
  }
};
