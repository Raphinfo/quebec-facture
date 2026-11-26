import { NextResponse } from "next/server";
import { InputError } from "./validation";
export async function readBodyText(
  request: Request,
  maxBytes = 100_000,
): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) throw new InputError("Requête vide.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.length;
    if (size > maxBytes) {
      await reader.cancel();
      throw new InputError("Requête trop volumineuse.", 413);
    }
    chunks.push(chunk.value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
export async function readJson(
  request: Request,
  maxBytes = 100_000,
): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new InputError("Un corps JSON est requis.", 415);
  const raw = await readBodyText(request, maxBytes);
  try {
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error();
    return body as Record<string, unknown>;
  } catch {
    throw new InputError("JSON invalide.");
  }
}
export function apiError(error: unknown) {
  if (error instanceof InputError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";
  if (code === "23505")
    return NextResponse.json(
      {
        error:
          "Cette opération existe déjà. Rechargez la page avant de réessayer.",
      },
      { status: 409 },
    );
  if (code === "23503")
    return NextResponse.json(
      { error: "Cet élément est encore associé à des documents." },
      { status: 409 },
    );
  const reference = crypto.randomUUID();
  console.error("Erreur API", {
    reference,
    code: /^[A-Z0-9]{5}$/.test(code) ? code : "INTERNAL",
  });
  return NextResponse.json(
    { error: "Une erreur est survenue. Réessayez plus tard.", reference },
    { status: 500 },
  );
}
