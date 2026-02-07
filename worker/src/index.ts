import "dotenv/config";
import express from "express";
import healthRouter from "./routes/health.js";
import generateRouter from "./routes/generate.js";
import auditAnalyzeRouter from "./routes/audit-analyze.js";

const app = express();
const port = parseInt(process.env.PORT || "8080", 10);

// Parse JSON bodies up to 10MB (audit data can be large)
app.use(express.json({ limit: "10mb" }));

// Routes
app.use(healthRouter);
app.use(generateRouter);
app.use(auditAnalyzeRouter);

// Global error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("[server] Unhandled error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
);

app.listen(port, "0.0.0.0", () => {
  console.log(`[server] Worker listening on port ${port}`);
  console.log(`[server] Health check: http://0.0.0.0:${port}/health`);
});
