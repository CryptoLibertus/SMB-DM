import type { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "crypto";

function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Compare against self to maintain constant time even on length mismatch
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env.WORKER_AUTH_SECRET;

  if (!secret) {
    console.error("WORKER_AUTH_SECRET is not configured");
    res.status(500).json({ error: "Server misconfigured" });
    return;
  }

  if (!timingSafeCompare(token, secret)) {
    res.status(403).json({ error: "Invalid auth token" });
    return;
  }

  next();
}
