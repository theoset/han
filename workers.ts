import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, workerServicesTable, quotesTable, jobsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { SubmitKycBody, SubmitQuoteBody } from "@workspace/api-zod";

const router = Router();

function getUserIdFromToken(req: any): number | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7);
    const payload = Buffer.from(token, "base64").toString();
    const [userId] = payload.split(":");
    return parseInt(userId);
  } catch {
    return null;
  }
}

router.get("/workers", async (req, res) => {
  try {
    const workers = await db.select().from(usersTable).where(eq(usersTable.role, "worker"));
    const services = await db.select().from(workerServicesTable);
    const servicesByWorker = services.reduce((acc, s) => {
      if (!acc[s.workerId]) acc[s.workerId] = [];
      acc[s.workerId].push(s.serviceType);
      return acc;
    }, {} as Record<number, string[]>);

    return res.json(workers.map(w => ({
      id: w.id,
      fullName: w.fullName,
      email: w.email,
      phone: w.phone,
      areaLocation: w.areaLocation ?? "",
      serviceTypes: servicesByWorker[w.id] ?? [],
      kycStatus: w.kycStatus ?? "pending",
      rating: w.rating ? parseFloat(w.rating) : null,
      jobsCompleted: w.jobsCompleted ?? 0,
      createdAt: w.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/workers/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const [worker] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!worker || worker.role !== "worker") return res.status(404).json({ error: "Worker not found" });
    const services = await db.select().from(workerServicesTable).where(eq(workerServicesTable.workerId, id));
    return res.json({
      id: worker.id,
      fullName: worker.fullName,
      email: worker.email,
      phone: worker.phone,
      areaLocation: worker.areaLocation ?? "",
      serviceTypes: services.map(s => s.serviceType),
      kycStatus: worker.kycStatus ?? "pending",
      rating: worker.rating ? parseFloat(worker.rating) : null,
      jobsCompleted: worker.jobsCompleted ?? 0,
      createdAt: worker.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/workers/kyc", async (req, res) => {
  const userId = getUserIdFromToken(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  const parsed = SubmitKycBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed" });
  try {
    await db.update(usersTable).set({
      idDocumentUrl: parsed.data.idDocumentUrl,
      selfieUrl: parsed.data.selfieUrl,
      proofOfAddressUrl: parsed.data.proofOfAddressUrl ?? null,
      kycConsent: parsed.data.consent,
      kycStatus: "pending",
      updatedAt: new Date(),
    }).where(eq(usersTable.id, userId));
    return res.json({ success: true, message: "KYC documents submitted for review" });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/quotes", async (req, res) => {
  const userId = getUserIdFromToken(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  const parsed = SubmitQuoteBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed" });
  if (parsed.data.amount < 150) return res.status(400).json({ error: "Minimum quote is P150" });
  try {
    const [quote] = await db.insert(quotesTable).values({
      jobId: parsed.data.jobId,
      workerId: userId,
      amount: parsed.data.amount,
      message: parsed.data.message ?? null,
      status: "pending",
    }).returning();
    return res.status(201).json({
      ...quote,
      workerName: null,
      workerRating: null,
      createdAt: quote.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/quotes/:jobId", async (req, res) => {
  const jobId = parseInt(req.params.jobId);
  if (isNaN(jobId)) return res.status(400).json({ error: "Invalid jobId" });
  try {
    const quotes = await db.select({
      quote: quotesTable,
      workerName: usersTable.fullName,
      workerRating: usersTable.rating,
    })
    .from(quotesTable)
    .leftJoin(usersTable, eq(quotesTable.workerId, usersTable.id))
    .where(eq(quotesTable.jobId, jobId));

    return res.json(quotes.map(r => ({
      ...r.quote,
      workerName: r.workerName,
      workerRating: r.workerRating ? parseFloat(r.workerRating) : null,
      createdAt: r.quote.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
