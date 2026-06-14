import express from "express";
import { clerkMiddleware } from '@clerk/express';
import { getInvoices } from "../controllers/invoiceController.js";
import { getInvoiceById } from "../controllers/invoiceController.js";
import { createInvoice } from "../controllers/invoiceController.js";
import { updateInvoice } from "../controllers/invoiceController.js";
import { deleteInvoice } from "../controllers/invoiceController.js";


const invoiceRouter = express.Router();
invoiceRouter.use(clerkMiddleware());

invoiceRouter.get("/", getInvoices);
invoiceRouter.get("/:id", getInvoiceById);
invoiceRouter.post("/", createInvoice);
invoiceRouter.put("/:id", updateInvoice);
invoiceRouter.delete("/:id", deleteInvoice);


export default invoiceRouter;