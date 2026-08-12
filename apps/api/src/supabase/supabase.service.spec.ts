import { ConfigService } from '@nestjs/config';
import { SupabaseService } from './supabase.service';

function fakeJwt(role: string): string {
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
  ).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ role, ref: 'test' })).toString(
    'base64url',
  );
  return `${header}.${payload}.sig`;
}

describe('SupabaseService', () => {
  it('rejects anon key masquerading as service role', () => {
    const config = {
      getOrThrow: (key: string) => {
        if (key === 'SUPABASE_URL') return 'https://example.supabase.co';
        if (key === 'SUPABASE_SERVICE_ROLE_KEY') return fakeJwt('anon');
        throw new Error(`unexpected ${key}`);
      },
    } as unknown as ConfigService;

    const service = new SupabaseService(config);
    expect(() => service.onModuleInit()).toThrow(/service_role/);
  });

  it('accepts a service_role JWT', () => {
    const config = {
      getOrThrow: (key: string) => {
        if (key === 'SUPABASE_URL') return 'https://example.supabase.co';
        if (key === 'SUPABASE_SERVICE_ROLE_KEY') return fakeJwt('service_role');
        throw new Error(`unexpected ${key}`);
      },
    } as unknown as ConfigService;

    const service = new SupabaseService(config);
    expect(() => service.onModuleInit()).not.toThrow();
    expect(service.db).toBeDefined();
  });
});
