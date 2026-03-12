import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';

// jsonwebtoken v9 typings are strict; cast env string to the expected expiresIn type.
const EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? '7d') as unknown as number | string;

export interface JwtPayload {
  userId: string;
  email: string;
}

export function signToken(payload: JwtPayload): string {
  // Cast jwt to any to avoid jsonwebtoken v9 overload issues on some TS configs
  return (jwt as any).sign(payload, SECRET, { expiresIn: EXPIRES_IN }) as string;
}

export function verifyToken(token: string): JwtPayload {
  return (jwt as any).verify(token, SECRET) as JwtPayload;
}