/**
 * GroqClient Service
 * Client-side interface for AI completions.
 * Routes requests through Supabase Edge Function 'ai-proxy' for credential isolation.
 * Provides fallback to client-supplied API key if provided in UserSettings.
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

export const GroqClient = {
  /**
   * Execute chat completion via the secure Supabase Edge Function proxy,
   * falling back to direct call only if the user supplied their own personal key.
   */
  async complete(options: GroqCompletionOptions): Promise<string | null> {
    const { model, messages, temperature = 0.1, response_format, customApiKey } = options;
    const isVisionRequest = messages.some(m => Array.isArray(m.content));
    const defaultModel = isVisionRequest ? 'qwen/qwen3.6-27b' : 'openai/gpt-oss-120b';
    const effectiveModel = model || defaultModel;

    // 1. Check if user provided their own personal key in settings or localStorage
    const personalGroqKey = customApiKey?.trim() || localStorage.getItem('trackxpense_groq_api_key')?.trim();
    const directGeminiKey = (
      localStorage.getItem('trackxpense_gemini_api_key')?.trim() ||
      (import.meta.env.VITE_GEMINI_API_KEY as string)?.trim() ||
      (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY ? (process.env.GEMINI_API_KEY as string).trim() : '')
    );

    // 2. If no personal user key, prioritize calling the secure Supabase Edge Function proxy (isolated server-side key)
    if (!personalGroqKey && !directGeminiKey) {
      try {
        const { data, error } = await supabase.functions.invoke('ai-proxy', {
          body: {
            model: effectiveModel,
            messages,
            temperature,
            response_format
          }
        });

        if (!error && data?.choices?.[0]?.message?.content) {
          const cleaned = GroqClient.cleanThinkTags(data.choices[0].message.content);
          if (cleaned) return cleaned;
        }
      } catch {
        // Fall back to direct resolution below if edge proxy is unconfigured
      }
    }

    const directGroqKey = (
      personalGroqKey ||
      (import.meta.env.VITE_GROQ_API_KEY as string)?.trim() ||
      (typeof process !== 'undefined' && process.env?.GROQ_API_KEY ? (process.env.GROQ_API_KEY as string).trim() : '') ||
      ''
    );

    // 2. If user has a Groq key (starts with gsk_ or customApiKey provided), call Groq API directly
    if (directGroqKey && (directGroqKey.startsWith('gsk_') || !directGeminiKey)) {
      const candidateModels = isVisionRequest
        ? [effectiveModel, 'qwen/qwen3.6-27b', 'qwen/qwen3.8-27b'].filter((m, i, arr) => arr.indexOf(m) === i)
        : [effectiveModel, 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b', 'qwen/qwen3.6-27b'].filter((m, i, arr) => arr.indexOf(m) === i);

      for (const m of candidateModels) {
        try {
          const payload: Record<string, any> = { model: m, messages, temperature };
          if (response_format) payload.response_format = response_format;
          if (isVisionRequest) payload.max_tokens = 800;

          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${directGroqKey}`,
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
              console.warn(`Groq model ${m} returned only thinking scratchpad without user response, trying next model...`);
            }
          } else {
            console.warn(`Groq model ${m} returned status ${res.status}, trying fallback...`);
          }
        } catch (err) {
          console.warn(`Direct Groq call for ${m} failed:`, err);
        }
      }
    }

    // 3. If user has a Gemini key (starts with AIza...), call Gemini API directly
    if (directGeminiKey) {
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
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${directGeminiKey}`,
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
      } catch (err) {
        console.warn('Direct Gemini call failed:', err);
      }
    }

    // 4. Fallback attempt: try calling Supabase Edge Function if deployed
    try {
      const { data, error } = await supabase.functions.invoke('ai-proxy', {
        body: {
          model,
          messages,
          temperature,
          response_format,
          customApiKey: customApiKey || undefined
        }
      });

      if (!error && data?.choices?.[0]?.message?.content) {
        return GroqClient.cleanThinkTags(data.choices[0].message.content);
      }
    } catch {
      // Edge function unavailable
    }

    return null;
  },

  /**
   * Strip <think>...</think> reasoning traces emitted by Qwen/DeepSeek models.
   * Also cleans unclosed <think>... blocks if response was truncated mid-thought.
   */
  cleanThinkTags(content: string): string {
    if (!content) return '';
    // 1. Strip closed <think>...</think> blocks
    let cleaned = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    // 2. Strip unclosed <think>... blocks (truncated mid-thought)
    cleaned = cleaned.replace(/<think>[\s\S]*$/gi, '').trim();
    return cleaned;
  },

  /**
   * Extract JSON object or array from LLM response text (handles markdown fences).
   */
  extractJson<T = any>(content: string): T | null {
    if (!content) return null;
    const clean = GroqClient.cleanThinkTags(content);
    
    // Check for markdown code fence
    const fenceMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const target = fenceMatch ? fenceMatch[1].trim() : clean;

    try {
      return JSON.parse(target);
    } catch {
      // Try scanning for outermost brackets
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
   * Transcribe recorded audio with Groq Whisper (whisper-large-v3-turbo / whisper-large-v3).
   * Works on any mobile or desktop browser supporting MediaRecorder.
   */
  async transcribeAudio(audioBlob: Blob, customApiKey?: string): Promise<string | null> {
    const key = (
      customApiKey?.trim() ||
      localStorage.getItem('trackxpense_groq_api_key')?.trim() ||
      (import.meta.env.VITE_GROQ_API_KEY as string)?.trim() ||
      (typeof process !== 'undefined' && process.env?.GROQ_API_KEY ? (process.env.GROQ_API_KEY as string).trim() : '') ||
      ''
    );

    if (!key) return null;

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
            'Authorization': `Bearer ${key}`
          },
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.text?.trim();
          if (text) return text;
        } else {
          console.warn(`Groq Whisper model ${model} failed:`, res.status);
        }
      } catch (err) {
        console.warn(`Error calling Groq Whisper model ${model}:`, err);
      }
    }
    return null;
  }
};
