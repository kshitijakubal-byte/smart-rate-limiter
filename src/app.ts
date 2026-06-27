import express from "express";
import authRoutes from "./modules/auth/auth.routes";
import otpRoutes from "./modules/otp/otp.routes";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/otp", otpRoutes);

app.use(errorHandler);

export default app;
