import { getAuth } from '@clerk/express';
import BusinessProfile from '../models/businessProfileModel.js';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';

// file to url
function uploadedFilesToUrls(req) {
    const urls = {};
    if (!req.files) return urls;

    const logoArr = req.files.logoName || req.files.logo || [];
    const stampArr = req.files.stampName || req.files.stamp || [];
    const sigArr = req.files.signatureNameMeta || req.files.signature || [];

    if (logoArr[0]) urls.logoUrl = `${API_BASE_URL}/uploads/${logoArr[0].filename}`;
    if (stampArr[0]) urls.stampUrl = `${API_BASE_URL}/uploads/${stampArr[0].filename}`;
    if (sigArr[0]) urls.signatureUrl = `${API_BASE_URL}/uploads/${sigArr[0].filename}`;

    return urls;
}

// create a new business profile
export async function createBusinessProfile(req, res) {
    try {
        const { userId } = getAuth(req);

        if (!userId) {
            return res.status(401).json({ message: "Authentication required" });
        }

        const body = req.body || {};
        const fileUrls = uploadedFilesToUrls(req);

        const profileData = {
            owner: userId,
            businessName: body.businessName || "ABC Solutions",
            email: body.email || "",
            address: body.address || "",
            phone: body.phone || "",
            gst: body.gst || "",
            logoUrl: fileUrls.logoUrl || body.logoUrl || null,
            stampUrl: fileUrls.stampUrl || body.stampUrl || null,
            signatureUrl: fileUrls.signatureUrl || body.signatureUrl || null,
            signatureOwnerName: body.signatureOwnerName || "",
            signatureOwnerTitle: body.signatureOwnerTitle || "",
            defaultTaxPercent:
                body.defaultTaxPercent !== undefined ? Number(body.defaultTaxPercent) : 18,
            notes: body.notes || "",
        };

        const existingProfile = await BusinessProfile.findOne({ owner: userId });
        const savedProfile = await BusinessProfile.findOneAndUpdate(
            { owner: userId },
            { $set: profileData },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true,
                runValidators: true,
            }
        );

        return res.status(existingProfile ? 200 : 201).json({
            success: true,
            message: existingProfile
                ? "Business profile updated successfully"
                : "Business profile created successfully",
            data: savedProfile
        });

    }
    catch (error) {
        console.error("Error creating business profile:", error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
}

// update an existing business profile
export async function updateBusinessProfile(req, res) {
    try {
        const { userId } = getAuth(req);

        if (!userId) {
            return res.status(401).json({ message: "Authentication required" });
        }

        const { id } = req.params;
        const body = req.body || {};
        const fileUrls = uploadedFilesToUrls(req);

        const existing = await BusinessProfile.findById(id);
        if (!existing) {
            return res.status(404).json({ message: "Business profile not found" });
        }
        if (existing.owner.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: "Forbidden : Business profile is not yours"
            });
        }

        const update = {};

        if (body.businessName !== undefined) update.businessName = body.businessName;
        if (body.email !== undefined) update.email = body.email;
        if (body.address !== undefined) update.address = body.address;
        if (body.phone !== undefined) update.phone = body.phone;
        if (body.gst !== undefined) update.gst = body.gst;

        if (fileUrls.logoUrl) update.logoUrl = fileUrls.logoUrl;
        else if (body.logoUrl !== undefined) update.logoUrl = body.logoUrl;

        if (fileUrls.stampUrl) update.stampUrl = fileUrls.stampUrl;
        else if (body.stampUrl !== undefined) update.stampUrl = body.stampUrl;

        if (fileUrls.signatureUrl) update.signatureUrl = fileUrls.signatureUrl;
        else if (body.signatureUrl !== undefined) update.signatureUrl = body.signatureUrl;

        if (body.signatureOwnerName !== undefined) update.signatureOwnerName = body.signatureOwnerName;
        if (body.signatureOwnerTitle !== undefined) update.signatureOwnerTitle = body.signatureOwnerTitle;
        if (body.defaultTaxPercent !== undefined) update.defaultTaxPercent = Number(body.defaultTaxPercent);
        if (body.notes !== undefined) update.notes = body.notes;

        const updatedProfile = await BusinessProfile.findByIdAndUpdate(id, update, {
            new: true,
            runValidators: true
        });
        return res.status(200).json({
            success: true,
            message: "Business profile updated successfully",
            data: updatedProfile
        });
    }
    catch (error) {
        console.error("Error updating business profile:", error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
}

// to get my business profile
export async function getMyBusinessProfile(req, res){
    try {
        const { userId } = getAuth(req);

        if (!userId) {
            return res.status(401).json({ message: "Authentication required" });
        }
        const profile = await BusinessProfile.findOne({ owner: userId }).lean();
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Business profile not found"
            });
        }
        return res.status(200).json({
            success: true,
            data: profile
        });
    }
    catch (error) {
        console.error("Error fetching business profile:", error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
}
