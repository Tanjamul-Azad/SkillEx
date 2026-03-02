import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

// ─────────────────────────────────────────────────────────────
//  Tiny in-memory mock API – handles /api/auth/* during dev so
//  the app works without a running Spring Boot backend.
// ─────────────────────────────────────────────────────────────
interface StoredUser {
  id: string; name: string; email: string; password: string;
  university: string; avatar: string;
  skillsOffered: never[]; skillsWanted: never[];
  sessionsCompleted: number; skillexScore: number; role: string;
}

const mockUsers = new Map<string, StoredUser>();

function makeToken(payload: unknown) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}
function parseToken(token: string) {
  try { return JSON.parse(Buffer.from(token, 'base64url').toString('utf8')) as Record<string, unknown>; }
  catch { return null; }
}
function readBody(req: IncomingMessage): Promise<Record<string, string>> {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c: Buffer) => (raw += c.toString()));
    req.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve({}); } });
  });
}

function mockApiPlugin(): Plugin {
  return {
    name: 'mock-api-dev',
    configureServer(server) {
      server.middlewares.use('/api/auth', async (
        req: IncomingMessage, res: ServerResponse, next: () => void
      ) => {
        const route = req.url ?? '';
        const send = (status: number, data: unknown) => {
          res.writeHead(status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
        };

        // POST /api/auth/register
        if (req.method === 'POST' && route === '/register') {
          const { name, email, password, university = 'University' } = await readBody(req);
          if (!name || !email || !password)
            return send(400, { message: 'Name, email and password are required.' });
          if (mockUsers.has(email))
            return send(409, { message: 'An account with this email already exists.' });
          const user = {
            id: `dev-${Date.now()}`, name, email, university,
            avatar: `https://picsum.photos/seed/${Date.now()}/80/80`,
            skillsOffered: [], skillsWanted: [],
            sessionsCompleted: 0, skillexScore: 120, role: 'student',
          };
          mockUsers.set(email, { ...user, password });
          return send(201, { token: makeToken(user), user, needsEmailConfirmation: false });
        }

        // POST /api/auth/login
        if (req.method === 'POST' && route === '/login') {
          const { email, password } = await readBody(req);
          const stored = mockUsers.get(email);
          if (!stored || stored.password !== password)
            return send(401, { message: 'Invalid email or password.' });
          const { password: _pw, ...user } = stored;
          return send(200, { token: makeToken(user), user });
        }

        // GET /api/auth/me
        if (req.method === 'GET' && route === '/me') {
          const auth = (req.headers['authorization'] as string | undefined) ?? '';
          const user = parseToken(auth.replace('Bearer ', ''));
          return user ? send(200, user) : send(401, { message: 'Unauthorized' });
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), mockApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@data': path.resolve(__dirname, '../database'),
      '@config': path.resolve(__dirname, './src/config'),
      '@scripts': path.resolve(__dirname, '../scripts'),
    },
  },
  server: {
    port: 3000,
    // Proxy real API calls to Spring Boot when it's running.
    // The mock plugin above takes precedence for /api/auth/* in dev.
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
