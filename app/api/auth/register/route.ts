import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createSession } from "@/lib/session";
import { apiError, readJson } from "@/lib/http";
import { emailAddress, passwordValue } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await readJson(request, 4096);
    const email = emailAddress(body.email);
    const password = passwordValue(body.password, true);
    await rateLimit(`register:${email}`, 3, 3600);
    await rateLimit("register:global", 100, 3600);
    const hash = await bcrypt.hash(password, 12);
    const userId = crypto.randomUUID();
    await getDb()`INSERT INTO "User" (id,email,password) VALUES (${userId},${email},${hash})`;
    const response = NextResponse.json(
      { message: "Compte créé." },
      { status: 201 },
    );
    await createSession(userId, response);
    return response;
  } catch (error) {
    return apiError(error);
  }
}
