import mongoose from 'mongoose';
import Invoice from '../models/invoiceModel.js';
import { getAuth } from '@clerk/express';
import path from 'path';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';

function computeTotals(items = [], taxPercent = 0) {
    const safe = Array.isArray(items) ? items : [];
    const subtotal = safe.reduce(
        (acc, item) => {
            const quantity = Number(item?.qty ?? item?.quantity ?? 0);
            const unitPrice = Number(item?.unitPrice ?? item?.price ?? 0);
            return acc + quantity * unitPrice;
        },
        0
    );
    const tax = (subtotal * Number(taxPercent || 0)) / 100;
    const total = subtotal + tax;
    return { subtotal, tax, total };
}// compute total subtotal, tax and total from items and taxPercent

function normalizeItems(items = []) {
    if (!Array.isArray(items)) return [];

    return items.map((item) => ({
        id: String(item?.id || new mongoose.Types.ObjectId()),
        description: String(item?.description || ""),
        qty: Number(item?.qty ?? item?.quantity ?? 0),
        unitPrice: Number(item?.unitPrice ?? item?.price ?? 0),
    }));
}

function parseItemsField(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
        try {
            return JSON.parse(val);
        }
        catch {
            return [];
        }
    }
    return val;
}

// check if the string is ObjectID
function isObjectIdString(val) {
    return typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);
}

// helper function for uploading files to public folder and returning the public url
function uploadedFilesToUrls(req) {
    const urls = {};
    if (!req.files) return urls;
    const mapping = {
        logoName: "logoDataUrl",
        stampName: "stampDataUrl",
        signatureNameMeta: "signatureDataUrl",
        logo: "logoDataUrl",
        stamp: "stampDataUrl",
        signature: "signatureDataUrl",
    };
    Object.keys(mapping).forEach((field) => {
        const arr = req.files[field];
        if (Array.isArray(arr) && arr[0]) {
            const filename =
                arr[0].filename || (arr[0].path && path.basename(arr[0].path));
            if (filename) urls[mapping[field]] = `${API_BASE_URL}/uploads/${filename}`;
        }
    });
    return urls;
}

// to generate unique invoice number to avoid collision in the DB for invoice number 
async function generateUniqueInvoiceNumber(userId, attempts = 8) {
    for (let i = 0; i < attempts; i++) {
        const ts = Date.now().toString();
        const suffix = Math.floor(Math.random() * 900000).toString().padStart(6, "0");
        const candidate = `INV-${ts.slice(-6)}-${suffix}`;

        const exists = await Invoice.exists({ owner: userId, invoiceNumber: candidate });
        if (!exists) return candidate;
        await new Promise((r) => setTimeout(r, 2));
    }
    return new mongoose.Types.ObjectId().toString();
}

// to create a invoice
export async function createInvoice(req, res) {
    try {
        const { userId } = getAuth(req) || {};
        if (!userId) {
            return res
                .status(401)
                .json({ success: false, message: "Authentication required" });
        }

        const body = req.body || {};
        const parsedItems = Array.isArray(body.items)
            ? body.items
            : parseItemsField(body.items);
        const items = normalizeItems(parsedItems);
        const taxPercent = Number(
            body.taxPercent ?? body.tax ?? body.defaultTaxPercent ?? 0
        );
        const totals = computeTotals(items, taxPercent);
        const fileUrls = uploadedFilesToUrls(req);

        // If client supplied invoiceNumber, ensure it doesn't already exist
        let invoiceNumberProvided =
            typeof body.invoiceNumber === "string" && body.invoiceNumber.trim()
                ? String(body.invoiceNumber).trim()
                : null;

        if (invoiceNumberProvided) {
            const duplicate = await Invoice.exists({ owner: userId, invoiceNumber: invoiceNumberProvided });
            if (duplicate) {
                return res
                    .status(409)
                    .json({ success: false, message: "Invoice number already exists" });
            }
        }

        // generate a unique invoice number (or use provided)
        let invoiceNumber = invoiceNumberProvided || (await generateUniqueInvoiceNumber(userId));

        // Build document
        const doc = new Invoice({
            _id: new mongoose.Types.ObjectId(),
            owner: userId, // associate invoice with Clerk userId
            invoiceNumber,
            issueDate: body.issueDate || new Date().toISOString().slice(0, 10),
            dueDate: body.dueDate || "",
            fromBusinessName: body.fromBusinessName || "",
            fromEmail: body.fromEmail || "",
            fromAddress: body.fromAddress || "",
            fromPhone: body.fromPhone || "",
            fromGst: body.fromGst || "",
            client:
                typeof body.client === "string" && body.client.trim()
                    ? { name: body.client }
                    : body.client || {},
            items,
            subtotal: totals.subtotal,
            tax: totals.tax,
            total: totals.total,
            currency: body.currency || "INR",
            status: body.status ? String(body.status).toLowerCase() : "draft",
            taxPercent,
            logoDataUrl:
                fileUrls.logoDataUrl || body.logoDataUrl || body.logo || null,
            stampDataUrl:
                fileUrls.stampDataUrl || body.stampDataUrl || body.stamp || null,
            signatureDataUrl:
                fileUrls.signatureDataUrl ||
                body.signatureDataUrl ||
                body.signature ||
                null,
            signatureName: body.signatureName || "",
            signatureTitle: body.signatureTitle || "",
            notes: body.notes || body.aiSource || "",
        });

        // Save with retry on duplicate-key (race conditions)
        let saved = null;
        let attempts = 0;
        const maxSaveAttempts = 6;
        while (attempts < maxSaveAttempts) {
            try {
                saved = await doc.save();
                break; // success
            } catch (err) {
                // If duplicate invoiceNumber (race), regenerate and retry
                if (err && err.code === 11000 && err.keyPattern && err.keyPattern.invoiceNumber) {
                    attempts += 1;
                    // generate a new invoiceNumber and set on doc
                    const newNumber = await generateUniqueInvoiceNumber(userId);
                    doc.invoiceNumber = newNumber;
                    // loop to try save again
                    continue;
                }
                // other errors → rethrow
                throw err;
            }
        }

        if (!saved) {
            return res.status(500).json({
                success: false,
                message: "Failed to create invoice after multiple attempts",
            });
        }

        return res
            .status(201)
            .json({ success: true, message: "Invoice created", data: saved });
    } catch (err) {
        console.error("createInvoice error:", err);
        if (err.type === "entity.too.large") {
            return res
                .status(413)
                .json({ success: false, message: "Payload too large" });
        }
        // handle duplicate key at top-level just in case
        if (err && err.code === 11000 && err.keyPattern && err.keyPattern.invoiceNumber) {
            return res
                .status(409)
                .json({ success: false, message: "Invoice number already exists" });
        }
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

// List of all invoices
export async function getInvoices(req, res) {
    try {
        const { userId } = getAuth(req) || {};
        if (!userId) {
            return res.status(401)
                .json({
                    success: false,
                    message: 'Authentication required'
                })
        }

        const q = { owner: userId };
        if (req.query.status) {
            q.status = req.query.status;
        }
        if (req.query.invoiceNumber) {
            q.invoiceNumber = req.query.invoiceNumber;
        }
        // for filter
        if (req.query.search) {
            const search = req.query.search.trim();
            q.$or = [
                { fromEmail: { $regex: search, $options: "i" } },
                { "client.email": { $regex: search, $options: "i" } },
                { "client.name": { $regex: search, $options: "i" } },
                { invoiceNumber: { $regex: search, $options: "i" } },
            ];
        }

        const invoices = await Invoice.find(q).sort({ createdAt: -1 }).lean();
        return res.status(200).json({
            success: true,
            data: invoices
        });
    }
    catch (error) {
        console.error("getInvoices error:", error);
        return res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
}

export async function getInvoiceById(req, res) {
    try {
        const { userId } = getAuth(req) || {};
        if (!userId) {
            return res.status(401)
                .json({
                    success: false,
                    message: 'Authentication required'
                })
        }

        const { id } = req.params;
        let inv;
        if (isObjectIdString(id)) inv = await Invoice.findById(id);
        else inv = await Invoice.findOne({ invoiceNumber: id });

        if (!inv) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        if (inv.owner && String(inv.owner) !== String(userId)) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden : Not your invoice'
            });
        }
        return res.status(200).json({
            success: true,
            data: inv
        });
    }
    catch (error) {
        console.error("getInvoicesById error:", error);
        return res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
}

// update invoice by id
export async function updateInvoice(req, res) {
    try {
        const { userId } = getAuth(req) || {};
        if (!userId) {
            return res.status(401)
                .json({
                    success: false,
                    message: 'Authentication required'
                })
        }

        const { id } = req.params;
        const body = req.body || {};

        const query = isObjectIdString(id) ? { _id: id, owner: userId } : { invoiceNumber: id, owner: userId };
        const existing = await Invoice.findOne(query);
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        // if user has updated the invoiceNumber
        // ensure that it not exist allready in the DB
        if (body.invoiceNumber && String(body.invoiceNumber).trim() !== existing.invoiceNumber) {
            const conflict = await Invoice.findOne({
                owner: userId,
                invoiceNumber: String(body.invoiceNumber).trim()
            });
            if (conflict && String(conflict._id) !== String(existing._id)) {
                return res
                    .status(409)
                    .json({ success: false, message: "Invoice number already exists" });
            }
        }

        let parsedItems = [];
        if (Array.isArray(body.items)) parsedItems = body.items;
        else if (typeof body.items === "string" && body.items.length) {
            try {
                parsedItems = JSON.parse(body.items);
            } catch {
                parsedItems = [];
            }
        }
        const items = normalizeItems(parsedItems);

        const taxPercent = Number(
            body.taxPercent ?? body.tax ?? body.defaultTaxPercent ?? existing.taxPercent ?? 0
        );
        const totals = computeTotals(items, taxPercent);
        const fileUrls = uploadedFilesToUrls(req);

        // to update 
        const update = {
            invoiceNumber: body.invoiceNumber,
            issueDate: body.issueDate,
            dueDate: body.dueDate,
            fromBusinessName: body.fromBusinessName,
            fromEmail: body.fromEmail,
            fromAddress: body.fromAddress,
            fromPhone: body.fromPhone,
            fromGst: body.fromGst,
            client:
                typeof body.client === "string" && body.client.trim()
                    ? { name: body.client }
                    : body.client || existing.client || {},
            items,
            subtotal: totals.subtotal,
            tax: totals.tax,
            total: totals.total,
            currency: body.currency,
            status: body.status ? String(body.status).toLowerCase() : undefined,
            taxPercent,
            logoDataUrl:
                fileUrls.logoDataUrl ||
                (body.logoDataUrl || body.logo) ||
                undefined,
            stampDataUrl:
                fileUrls.stampDataUrl ||
                (body.stampDataUrl || body.stamp) ||
                undefined,
            signatureDataUrl:
                fileUrls.signatureDataUrl ||
                (body.signatureDataUrl || body.signature) ||
                undefined,
            signatureName: body.signatureName,
            signatureTitle: body.signatureTitle,
            notes: body.notes,
        };

        Object.keys(update).forEach((key) => {
            if (update[key] === undefined) delete update[key];
        });

        const updated = await Invoice.findOneAndUpdate(
            { _id: existing._id },
            { $set: update },
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update invoice'
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Invoice updated successfully',
            data: updated
        });
    }
    catch (err) {
        console.error("updateInvoice error:", err);
        if (err && err.code === 11000 && err.keyPattern && err.keyPattern.invoiceNumber) {
            return res
                .status(409)
                .json({ success: false, message: "Invoice number already exists" });
        }
        return res.status(500).json({ success: false, message: "Server error" });
    }

}

// to delete an invoice by id
export async function deleteInvoice(req, res){
    try{
        const { userId } = getAuth(req) || {};
        if (!userId) {
            return res.status(401)
                .json({
                    success: false,
                    message: 'Authentication required'
                })
        }

        const { id } = req.params;
        const query = isObjectIdString(id) ? { _id: id, owner: userId } : { invoiceNumber: id, owner: userId };
        const existing = await Invoice.findOne(query);
        if(!existing){
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        await Invoice.deleteOne({ _id: existing._id });
        return res.status(200).json({
            success: true,
            message: 'Invoice deleted successfully'
        });
    }
    catch (error) {
        console.error("DELETEINVOICE error:", error);
        return res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
}
