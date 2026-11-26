import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createSession } from "@/lib/session";
import { apiError, readJson } from "@/lib/http";
import { InputError, emailAddress, passwordValue } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await readJson(request, 4096);
    const email = emailAddress(body.email);
    const password = passwordValue(body.password);
    await rateLimit(`login:${email}`);
    await rateLimit("login:global", 300, 900);
    const users =
      await getDb()`SELECT id,password FROM "User" WHERE LOWER(TRIM(email))=${email}`;
    const dummyHash =
      "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW";
    const valid = await bcrypt.compare(
      password,
      users[0]?.password ?? dummyHash,
    );
    if (users.length !== 1 || !valid)
      throw new InputError("Identifiants incorrects.", 401);
    const response = NextResponse.json({ message: "Connexion réussie." });
    await createSession(users[0].id, response);
    return response;
  } catch (error) {
    return apiError(error);
  }
}
