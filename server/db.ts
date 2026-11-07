import { eq } from "drizzle-orm";
import {
  organizations,
  meetings,
  documents,
  complianceLogs,
  auditLogs,
} from "../drizzle/schema";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

/** Managed hosts (TiDB Cloud, Aiven, PlanetScale, …) require a TLS connection. */
function requiresTls(url: string): boolean {
  return (
    /tidbcloud\.com|aivencloud\.com|psdb\.cloud|planetscale|[?&]ssl=|sslaccept=/.test(url) ||
    process.env.DB_SSL === "true"
  );
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const url = process.env.DATABASE_URL;
      if (requiresTls(url)) {
        // Parse the URL and connect over TLS explicitly (cloud MySQL rejects
        // plaintext). Works whether or not the URL carries an ?ssl= param.
        const u = new URL(url);
        const pool = mysql.createPool({
          host: u.hostname,
          port: u.port ? Number(u.port) : 3306,
          user: decodeURIComponent(u.username),
          password: decodeURIComponent(u.password),
          database: u.pathname.replace(/^\//, "") || undefined,
          ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
        });
        _db = drizzle(pool);
      } else {
        _db = drizzle(url);
      }
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.error("[Database] Cannot upsert user: database not available. DATABASE_URL:", process.env.DATABASE_URL ? "set" : "not set");
    throw new Error("Database connection not available for user upsert");
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "passwordHash"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.isEmailVerified !== undefined) {
      values.isEmailVerified = user.isEmailVerified;
      updateSet.isEmailVerified = user.isEmailVerified;
    }

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Organization queries
export async function getOrganizationById(organizationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Meeting queries
export async function getMeetingsByOrganization(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(meetings).where(eq(meetings.organizationId, organizationId));
}

export async function getMeetingById(meetingId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(meetings).where(eq(meetings.id, meetingId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Document queries
export async function getDocumentsByOrganization(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documents).where(eq(documents.organizationId, organizationId));
}

// Compliance queries
export async function getComplianceLogsByOrganization(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(complianceLogs).where(eq(complianceLogs.organizationId, organizationId));
}

// Audit queries
export async function getAuditLogsByOrganization(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs).where(eq(auditLogs.organizationId, organizationId));
}
