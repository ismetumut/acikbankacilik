import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";

const JWT_SECRET = process.env.JWT_SECRET ?? "akort-dev-secret-change-me-in-production";
const TOKEN_TTL = "7d";

export function hashPassword(pw: string): string {
  return bcrypt.hashSync(pw, 10);
}

export function verifyPassword(pw: string, hash: string): boolean {
  return bcrypt.compareSync(pw, hash);
}

export interface TokenPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
}

export function signToken(p: TokenPayload): string {
  return jwt.sign(p, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export interface AuthedRequest extends Request {
  user?: TokenPayload;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Yetkilendirme gerekli." });
    return;
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET) as TokenPayload;
    next();
  } catch {
    res.status(401).json({ error: "Oturum geçersiz veya süresi dolmuş." });
  }
}
