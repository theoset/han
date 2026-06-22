import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, workerServicesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  RegisterCustomerBody,
  RegisterWorkerBody,
  LoginBody,
} from "@workspace/api-zod";
import * as crypto from "crypto";

const router = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "handled_salt_2025").digest("hex");
}

function comparePassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

function generateToken(userId: number, role: string): string {
  const payload = `${userId}:${role}:${Date.now()}`;
  return Buffer.from(payload).toString("base64");
}

router.post("/auth/register/customer", async (req, res) => {
  const parsed = RegisterCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed" });
  }
  const { fullName, email, password, phone } = parsed.data;
  try {
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }
    const [user] = await db.insert(usersTable).values({
      fullName,
      email,
      passwordHash: hashPassword(password),
      phone,
      role: "customer",
    }).returning();
    const token = generateToken(user.id, user.role);
    req.session = { userId: user.id, role: user.role } as any;
    return res.status(201).json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        kycStatus: user.kycStatus,
        areaLocation: user.areaLocation,
      },
      token,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/auth/register/worker", async (req, res) => {
  const parsed = RegisterWorkerBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed" });
  }
  const { fullName, email, password, phone, areaLocation, serviceTypes, kycConsent } = parsed.data;
  try {
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }
    const [user] = await db.insert(usersTable).values({
      fullName,
      email,
      passwordHash: hashPassword(password),
      phone,
      role: "worker",
      areaLocation,
      kycStatus: "pending",
      kycConsent,
    }).returning();
    if (serviceTypes && serviceTypes.length > 0) {
      await db.insert(workerServicesTable).values(
        serviceTypes.map((st) => ({ workerId: user.id, serviceType: st }))
      );
    }
    const token = generateToken(user.id, user.role);
    req.session = { userId: user.id, role: user.role } as any;
    return res.status(201).json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        kycStatus: user.kycStatus,
        areaLocation: user.areaLocation,
      },
      token,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed" });
  }
  const { email, password, role } = parsed.data;
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user || !comparePassword(password, user.passwordHash)) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    if (user.role !== role) {
      return res.status(401).json({ error: `No ${role} account found with this email` });
    }
    const token = generateToken(user.id, user.role);
    req.session = { userId: user.id, role: user.role } as any;
    return res.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        kycStatus: user.kycStatus,
        areaLocation: user.areaLocation,
      },
      token,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/auth/logout", (req, res) => {
  req.session = null as any;
  return res.json({ success: true, message: "Logged out" });
});

router.get("/auth/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    const token = authHeader.slice(7);
    const payload = Buffer.from(token, "base64").toString();
    const [userId] = payload.split(":");
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, parseInt(userId))).limit(1);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    return res.json({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      kycStatus: user.kycStatus,
      areaLocation: user.areaLocation,
    });
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
