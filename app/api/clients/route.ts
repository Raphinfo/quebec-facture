import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { apiError, readJson } from "@/lib/http";
import { text, emailAddress } from "@/lib/validation";
export async function GET() {
  try {
    const userId = await requireUser();
    return NextResponse.json(
      await getDb()`SELECT *,company AS "companyName" FROM "Client" WHERE "userId"=${userId} ORDER BY id DESC`,
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    const userId = await requireUser();
    const b = await readJson(request);
    const name = text(b.name, "Nom", 200, true),
      company = text(b.company ?? b.companyName, "Entreprise", 200);
    const email = b.email ? emailAddress(b.email) : "";
    const address = text(b.address, "Adresse", 500),
      phone = text(b.phone, "Téléphone", 40),
      neq = text(b.neq, "NEQ", 20);
    const [client] =
      await getDb()`INSERT INTO "Client" ("userId",name,company,neq,address,email,phone) VALUES (${userId},${name},${company},${neq},${address},${email},${phone}) RETURNING id,name,company,email`;
    return NextResponse.json(
      { message: "Client ajouté.", client },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}
