import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { apiError, readJson } from "@/lib/http";
import { InputError, clientIdValue, text, emailAddress } from "@/lib/validation";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUser();
    const id = clientIdValue((await context.params).id);
    const b = await readJson(request);
    const name = text(b.name, "Nom", 200, true);
    const company = text(b.company ?? b.companyName, "Entreprise", 200);
    const email = b.email ? emailAddress(b.email) : "";
    const address = text(b.address, "Adresse", 500);
    const phone = text(b.phone, "Téléphone", 40);
    const neq = text(b.neq, "NEQ", 20);
    const [client] =
      await getDb()`UPDATE "Client" SET name=${name},company=${company},neq=${neq},address=${address},email=${email},phone=${phone} WHERE id=${id} AND "userId"=${userId} RETURNING id,name,company,neq,address,email,phone`;
    if (!client) throw new InputError("Client introuvable.", 404);
    return NextResponse.json({ message: "Client mis à jour.", client });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUser();
    const id = clientIdValue((await context.params).id);
    const result =
      await getDb()`DELETE FROM "Client" WHERE id=${id} AND "userId"=${userId} RETURNING id`;
    if (!result.length) throw new InputError("Client introuvable.", 404);
    return NextResponse.json({ message: "Client supprimé." });
  } catch (error) {
    return apiError(error);
  }
}
