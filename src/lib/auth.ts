import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { User } from "./db";
import { ensureSecurityTables } from "./security";

const COOKIE = "nexora_session";
const SESSION_DAYS = 14;

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to a strong value (32+ chars)");
  }
  return new TextEncoder().encode(secret);
}

export function newId(prefix = "") {
  return `${prefix}${randomBytes(12).toString("hex")}`;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  ensureSecurityTables();
  const jti = randomBytes(16).toString("hex");
  const token = await new SignJWT({ sub: userId, jti })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSessionUser(): Promise<User | null> {
  const { ensureBootstrapped, getDb } = await import("./db");
  await ensureBootstrapped();
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    const id = payload.sub;
    if (!id || typeof id !== "string") return null;
    const user = getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as User | undefined;
    return user ?? null;
  } catch {
    return null;
  }
}

export function requireRole(user: User | null, roles: User["role"][]) {
  if (!user || !roles.includes(user.role)) {
    throw new Error("UNAUTHORIZED");
  }
}

export function certificateCode(userId: string, courseId: string) {
  return createHash("sha256")
    .update(`${userId}:${courseId}:nexora`)
    .digest("hex")
    .slice(0, 12)
    .toUpperCase();
}
