import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const isLoopback = (addr?: string | null): boolean => {
  if (!addr) return false;
  return addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
};

/**
 * Development-only Node proxy for local testing without exposing GROQ_API_KEY to the browser.
 * Never included in production builds (`vite build`).
 */
function devAiProxyPlugin(groqApiKey?: string): Plugin {
  return {
    name: 'dev-ai-proxy',
    configureServer(server) {
      server.middlewares.use('/__dev-ai-proxy', async (req, res, next) => {
        if (req.method !== 'POST') return next();

        if (!isLoopback(req.socket?.remoteAddress)) {
          res.statusCode = 403;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Local dev AI proxy only accepts loopback requests.' }));
          return;
        }

        const key = (groqApiKey || '').trim();
        if (!key) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'GROQ_API_KEY is not configured in .env.local.' }));
          return;
        }

        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));

          if (body?.action === 'transcribe' && body.audioBase64) {
            const binary = Buffer.from(body.audioBase64, 'base64');
            const mimeType = typeof body.mimeType === 'string' ? body.mimeType : 'audio/webm';
            const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : mimeType.includes('wav') ? 'wav' : 'webm';
            const form = new FormData();
            form.append('file', new Blob([binary], { type: mimeType }), `speech.${ext}`);
            form.append('model', body.model || 'whisper-large-v3-turbo');
            form.append('response_format', 'json');

            const upstream = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
              method: 'POST',
              headers: { Authorization: `Bearer ${key}` },
              body: form
            });
            const data = await upstream.json();
            res.statusCode = upstream.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
            return;
          }

          const payload: Record<string, any> = {
            model: body.model || 'openai/gpt-oss-120b',
            messages: body.messages,
            temperature: typeof body.temperature === 'number' ? body.temperature : 0.1
          };
          if (body.response_format) payload.response_format = body.response_format;
          if (typeof body.max_tokens === 'number') payload.max_tokens = body.max_tokens;

          const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${key}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });
          const data = await upstream.json();
          res.statusCode = upstream.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err?.message || 'Dev AI proxy error' }));
        }
      });
    }
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        ...(mode === 'development' ? [devAiProxyPlugin(env.GROQ_API_KEY)] : [])
      ],
      esbuild: {
        drop: mode === 'production' ? ['console', 'debugger'] : []
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
