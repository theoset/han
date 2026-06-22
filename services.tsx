import { Router } from "express";
import { db } from "@workspace/db";
import { jobsTable, usersTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { SendContactMessageBody } from "@workspace/api-zod";
import { contactMessagesTable } from "@workspace/db";

const router = Router();

const SERVICE_CATEGORIES = [
  {
    id: "house-cleaning",
    name: "House Cleaning",
    description: "Professional cleaning for any size home",
    icon: "Home",
    tiers: [
      { id: "single-room", name: "Single room", price: 120, unit: "flat" },
      { id: "1-bedroom", name: "1 bedroom", price: 180, unit: "flat" },
      { id: "2-bedroom", name: "2 bedroom", price: 250, unit: "flat" },
      { id: "3-bedroom", name: "3 bedroom", price: 350, unit: "flat" },
      { id: "4-plus-bedroom", name: "4+ bedroom", price: 450, unit: "from" },
    ],
  },
  {
    id: "gardening",
    name: "Gardening",
    description: "Garden maintenance from small to large estates",
    icon: "Sprout",
    tiers: [
      { id: "small", name: "Small (townhouse/front)", price: 120, unit: "flat" },
      { id: "medium", name: "Medium (standard)", price: 220, unit: "flat" },
      { id: "large", name: "Large (large residential)", price: 350, unit: "flat" },
      { id: "xlarge", name: "Extra Large (plot/estate)", price: 500, unit: "from" },
    ],
  },
  {
    id: "moving-assistance",
    name: "Moving Assistance",
    description: "Single items to full house relocations",
    icon: "Truck",
    tiers: [
      { id: "single-item", name: "Single item", price: 350, unit: "flat" },
      { id: "room-move", name: "Room Move", price: 300, unit: "flat" },
      { id: "small-house", name: "Small house", price: 600, unit: "flat" },
      { id: "large-house", name: "Large house", price: 1000, unit: "flat" },
    ],
  },
  {
    id: "handyman",
    name: "Handyman",
    description: "Fixes, assembly, mounting, and general repairs",
    icon: "Hammer",
    tiers: [
      { id: "simple-fix", name: "Simple fix", price: 120, unit: "flat" },
      { id: "furniture-assembly", name: "Furniture Assembly", price: 180, unit: "flat" },
      { id: "tv-mounting", name: "TV Mounting", price: 250, unit: "flat" },
      { id: "general-repairs", name: "General Repairs", price: 150, unit: "/hour" },
    ],
  },
  {
    id: "plumbing",
    name: "Plumbing",
    description: "Taps, drains, toilets, pipe repairs",
    icon: "Wrench",
    tiers: [
      { id: "simple-fix", name: "Simple fix", price: 120, unit: "flat" },
      { id: "diagnose-quote", name: "Diagnose & Quote", price: 180, unit: "flat" },
      { id: "standard-repair", name: "Standard repair", price: 250, unit: "flat" },
      { id: "general-repairs", name: "General Repairs", price: 150, unit: "/hour" },
    ],
  },
  {
    id: "delivery",
    name: "Delivery",
    description: "Small to heavy packages across Gaborone",
    icon: "Package",
    tiers: [
      { id: "small-package", name: "Small package", price: 50, unit: "flat" },
      { id: "medium-package", name: "Medium package", price: 80, unit: "flat" },
      { id: "heavy-item", name: "Heavy/bulky item", price: 150, unit: "flat" },
    ],
  },
  {
    id: "miscellaneous",
    name: "Miscellaneous",
    description: "Describe your task freely. Workers submit quotes.",
    icon: "MoreHorizontal",
    tiers: [
      { id: "custom", name: "Custom quote", price: 150, unit: "minimum" },
    ],
  },
];

router.get("/services", (req, res) => {
  return res.json(SERVICE_CATEGORIES);
});

router.get("/stats/summary", async (req, res) => {
  try {
    const allJobs = await db.select().from(jobsTable);
    const openJobs = allJobs.filter(j => j.status === "open").length;
    const completedJobs = allJobs.filter(j => j.status === "completed").length;
    const verifiedWorkers = await db.select().from(usersTable)
      .where(eq(usersTable.kycStatus, "verified"));

    const serviceCount: Record<string, number> = {};
    allJobs.forEach(j => { serviceCount[j.serviceType] = (serviceCount[j.serviceType] ?? 0) + 1; });
    const popularService = Object.entries(serviceCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "House Cleaning";

    return res.json({
      totalJobs: allJobs.length,
      openJobs,
      completedJobs,
      verifiedWorkers: verifiedWorkers.length,
      popularService,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/contact", async (req, res) => {
  const parsed = SendContactMessageBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed" });
  try {
    await db.insert(contactMessagesTable).values({
      name: parsed.data.name,
      email: parsed.data.email,
      message: parsed.data.message,
    });
    return res.json({ success: true, message: "Message received. We will be in touch soon." });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
