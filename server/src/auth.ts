import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { db } from "./db.js";

export const JWT_SECRET = process.env.JWT_SECRET || "vunaflow-dev-secret-change-me";

export interface AuthUser {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  language: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export function signToken(userId: number, remember = false): string {
  return jwt.sign({ uid: userId }, JWT_SECRET, { expiresIn: remember ? "30d" : "1d" });
}

export function publicUser(row: any): AuthUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    language: row.language,
  };
}

export function authRequired(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "auth_required" });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { uid: number };
    const row = db.prepare("SELECT * FROM users WHERE id = ?").get(payload.uid);
    if (!row) return res.status(401).json({ error: "invalid_token" });
    req.user = publicUser(row);
    next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "forbidden" });
    }
    next();
  };
}
