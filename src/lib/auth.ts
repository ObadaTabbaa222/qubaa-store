import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

export type SessionUser = { sub: string; role: 'admin' | 'student'; username: string; name: string };

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET مفقود');
  return new TextEncoder().encode(s);
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}
export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export async function signSession(u: SessionUser): Promise<string> {
  return new SignJWT({ role: u.role, username: u.username, name: u.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(u.sub)
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      sub: payload.sub as string,
      role: payload.role as 'admin' | 'student',
      username: payload.username as string,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = 'qubaa_session';
