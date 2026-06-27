import { Router } from "express";
import * as otpController from "./otp.controller";

const router = Router();

router.post("/send", otpController.sendOtp);
router.get("/status/:id", otpController.getOtpStatus);
router.patch("/resend", otpController.resendOtp);
router.delete("/cancel/:id", otpController.cancelOtp);

export default router;
