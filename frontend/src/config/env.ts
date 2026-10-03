import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().default('http://localhost:4000/api/v1').refine(
    (value) => value.startsWith('/') || URL.canParse(value),
    'NEXT_PUBLIC_API_URL harus berupa URL absolut atau path yang diawali /',
  ),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const _env = envSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NODE_ENV: process.env.NODE_ENV,
});

if (!_env.success) {
  console.error('❌ Invalid frontend environment variables:', _env.error.format());
  throw new Error('Invalid frontend environment variables');
}

export const env = _env.data;
