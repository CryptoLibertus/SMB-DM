import type { Request, Response, NextFunction } from "express";

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

  if (token !== secret) {
    res.status(403).json({ error: "Invalid auth token" });
    return;
  }

  next();
}
