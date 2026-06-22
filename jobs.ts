import { Router } from "express";
import { db } from "@workspace/db";
import { jobsTable, jobPhotosTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateJobBody,
  UpdateJobBody,
  UploadJobPhotoBody,
} from "@workspace/api-zod";

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

const SERVICE_PRICES: Record<string, Record<string, number>> = {
  "House Cleaning": {
    "Single room": 120,
    "1 bedroom": 180,
    "2 bedroom": 250,
    "3 bedroom": 350,
    "4+ bedroom": 450,
  },
  "Gardening": {
    "Small (townhouse/front)": 120,
    "Medium (standard)": 220,
    "Large (large residential)": 350,
    "Extra Large (plot/estate)": 500,
  },
  "Moving Assistance": {
    "Single item": 350,
    "Room Move": 300,
    "Small house": 600,
    "Large house": 1000,
  },
  "Handyman": {
    "Simple fix": 120,
    "Furniture Assembly": 180,
    "TV Mounting": 250,
    "General Repairs (hourly)": 150,
  },
  "Plumbing": {
    "Simple fix": 120,
    "Diagnose & Quote": 180,
    "Standard repair": 250,
    "General Repairs (hourly)": 150,
  },
  "Delivery": {
    "Small package": 50,
    "Medium package": 80,
    "Heavy/bulky item": 150,
  },
  "Miscellaneous": {
    "Custom quote": 150,
  },
};

router.get("/jobs", async (req, res) => {
  try {
    const { serviceType, status, limit = "20", offset = "0" } = req.query as any;
    let query = db.select({
      job: jobsTable,
      customerName: usersTable.fullName,
    })
    .from(jobsTable)
    .leftJoin(usersTable, eq(jobsTable.customerId, usersTable.id));

    const jobs = await query.limit(parseInt(limit)).offset(parseInt(offset));

    const photos = await db.select().from(jobPhotosTable);
    const photosByJob = photos.reduce((acc, p) => {
      if (!acc[p.jobId]) acc[p.jobId] = [];
      acc[p.jobId].push(p);
      return acc;
    }, {} as Record<number, typeof photos>);

    const filtered = jobs
      .filter(r => !serviceType || r.job.serviceType === serviceType)
      .filter(r => !status ? r.job.status === "open" : r.job.status === status);

    return res.json(filtered.map(r => ({
      ...r.job,
      customerName: r.customerName,
      workerName: null,
      photos: (photosByJob[r.job.id] || []).map(p => ({
        id: p.id,
        jobId: p.jobId,
        photoType: p.photoType,
        photoUrl: p.photoUrl,
        uploadedBy: p.uploadedBy,
        createdAt: p.createdAt.toISOString(),
      })),
      createdAt: r.job.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/jobs", async (req, res) => {
  const userId = getUserIdFromToken(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const parsed = CreateJobBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed" });
  }

  const { serviceType, serviceTier, description, preferredDate, preferredTime, locationLat, locationLng, locationAddress, transportZone } = parsed.data;
  const transportFee = transportZone === "inside_gaborone" ? 30 : 50;
  const basePrice = serviceTier ? (SERVICE_PRICES[serviceType]?.[serviceTier] ?? null) : null;
  const platformFee = basePrice ? Math.round(basePrice * 0.15 * 100) / 100 : null;
  const totalPrice = basePrice ? Math.round((basePrice + transportFee + (platformFee ?? 0)) * 100) / 100 : null;

  try {
    const [job] = await db.insert(jobsTable).values({
      customerId: userId,
      serviceType,
      serviceTier: serviceTier ?? null,
      description,
      preferredDate,
      preferredTime,
      locationLat,
      locationLng,
      locationAddress: locationAddress ?? null,
      transportZone,
      transportFee,
      basePrice,
      platformFee,
      totalPrice,
      status: "open",
    }).returning();

    return res.status(201).json({
      ...job,
      photos: [],
      customerName: null,
      workerName: null,
      createdAt: job.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/jobs/my/customer", async (req, res) => {
  const userId = getUserIdFromToken(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  try {
    const jobs = await db.select().from(jobsTable).where(eq(jobsTable.customerId, userId));
    const photos = await db.select().from(jobPhotosTable);
    const photosByJob = photos.reduce((acc, p) => {
      if (!acc[p.jobId]) acc[p.jobId] = [];
      acc[p.jobId].push(p);
      return acc;
    }, {} as Record<number, typeof photos>);

    return res.json(jobs.map(j => ({
      ...j,
      photos: (photosByJob[j.id] || []).map(p => ({
        id: p.id,
        jobId: p.jobId,
        photoType: p.photoType,
        photoUrl: p.photoUrl,
        uploadedBy: p.uploadedBy,
        createdAt: p.createdAt.toISOString(),
      })),
      customerName: null,
      workerName: null,
      createdAt: j.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/jobs/my/worker", async (req, res) => {
  const userId = getUserIdFromToken(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  try {
    const jobs = await db.select().from(jobsTable).where(eq(jobsTable.workerId, userId));
    const photos = await db.select().from(jobPhotosTable);
    const photosByJob = photos.reduce((acc, p) => {
      if (!acc[p.jobId]) acc[p.jobId] = [];
      acc[p.jobId].push(p);
      return acc;
    }, {} as Record<number, typeof photos>);

    return res.json(jobs.map(j => ({
      ...j,
      photos: (photosByJob[j.id] || []).map(p => ({
        id: p.id,
        jobId: p.jobId,
        photoType: p.photoType,
        photoUrl: p.photoUrl,
        uploadedBy: p.uploadedBy,
        createdAt: p.createdAt.toISOString(),
      })),
      customerName: null,
      workerName: null,
      createdAt: j.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/jobs/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id)).limit(1);
    if (!job) return res.status(404).json({ error: "Job not found" });
    const photos = await db.select().from(jobPhotosTable).where(eq(jobPhotosTable.jobId, id));
    return res.json({
      ...job,
      photos: photos.map(p => ({
        id: p.id,
        jobId: p.jobId,
        photoType: p.photoType,
        photoUrl: p.photoUrl,
        uploadedBy: p.uploadedBy,
        createdAt: p.createdAt.toISOString(),
      })),
      customerName: null,
      workerName: null,
      createdAt: job.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.patch("/jobs/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = UpdateJobBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed" });
  try {
    const [job] = await db.update(jobsTable)
      .set({ ...parsed.data, updatedAt: new Date() } as any)
      .where(eq(jobsTable.id, id))
      .returning();
    if (!job) return res.status(404).json({ error: "Job not found" });
    return res.json({
      ...job,
      photos: [],
      customerName: null,
      workerName: null,
      createdAt: job.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/jobs/:id/accept", async (req, res) => {
  const id = parseInt(req.params.id);
  const userId = getUserIdFromToken(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const [existing] = await db.select().from(jobsTable).where(eq(jobsTable.id, id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Job not found" });
    if (existing.status !== "open") return res.status(400).json({ error: "Job is not open" });
    const [job] = await db.update(jobsTable)
      .set({ workerId: userId, status: "accepted", updatedAt: new Date() })
      .where(eq(jobsTable.id, id))
      .returning();
    return res.json({
      ...job,
      photos: [],
      customerName: null,
      workerName: null,
      createdAt: job.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/jobs/:id/complete", async (req, res) => {
  const id = parseInt(req.params.id);
  const userId = getUserIdFromToken(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const [job] = await db.update(jobsTable)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(jobsTable.id, id))
      .returning();
    if (!job) return res.status(404).json({ error: "Job not found" });
    await db.update(usersTable)
      .set({ jobsCompleted: (job as any).jobsCompleted + 1 })
      .where(eq(usersTable.id, userId));
    return res.json({
      ...job,
      photos: [],
      customerName: null,
      workerName: null,
      createdAt: job.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/jobs/:id/photos", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = UploadJobPhotoBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed" });
  try {
    const [photo] = await db.insert(jobPhotosTable).values({
      jobId: id,
      photoType: parsed.data.photoType,
      photoUrl: parsed.data.photoUrl,
      uploadedBy: parsed.data.uploadedBy,
    }).returning();
    return res.status(201).json({
      ...photo,
      createdAt: photo.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
