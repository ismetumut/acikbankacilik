import express from "express";
import cors from "cors";
import { runSeed } from "./seed";
import { apiRouter } from "./routes";

const app = express();
app.use(cors());
app.use(express.json());

runSeed();

app.get("/health", (_req, res) => res.json({ ok: true, service: "akort-api" }));
app.use("/api", apiRouter);

const PORT = Number(process.env.PORT ?? 8787);
app.listen(PORT, () => {
  console.log(`[akort] API hazır → http://localhost:${PORT}`);
});
