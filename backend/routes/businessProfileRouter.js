import express from "express";
import multer from "multer";
import path from "path";
import { clerkMiddleware } from '@clerk/express';
import { createBusinessProfile } from "../controllers/businessProfileController.js";
import { updateBusinessProfile } from "../controllers/businessProfileController.js";
import { getMyBusinessProfile } from "../controllers/businessProfileController.js";

const businessProfileRouter = express.Router();

businessProfileRouter.use(clerkMiddleware());

// multer setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(process.cwd(), 'uploads'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `business-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({ storage });

// to create file
businessProfileRouter.post(
    "/",
    upload.fields([
        { name: "logoName", maxCount: 1 },
        { name: "stampName", maxCount: 1 },
        { name: "signatureNameMeta", maxCount: 1 },
    ]),
    createBusinessProfile);

// to update file
businessProfileRouter.put(
    "/:id",
    upload.fields([
        { name: "logoName", maxCount: 1 },
        { name: "stampName", maxCount: 1 },
        { name: "signatureNameMeta", maxCount: 1 },
    ]), 
    updateBusinessProfile);
businessProfileRouter.get("/me", getMyBusinessProfile);

export default businessProfileRouter;