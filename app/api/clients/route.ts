import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// 1. RÉCUPÉRER LES CLIENTS
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_session')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }

    const sql = getDb(); // Instanciation lazy
    const clients = await sql`
      SELECT * FROM "Client"
      WHERE "userId" = ${userId}
      ORDER BY id DESC
    `;

    return NextResponse.json(clients, { status: 200 });
  } catch (error: any) {
    console.error("❌ Erreur GET /api/clients :", error.message);
    return NextResponse.json([], { status: 200 });
  }
}

// 2. AJOUTER UN CLIENT
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_session')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }

    const body = await request.json();
    
    // Ping de vérification de session (body vide)
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const { name, company, neq, address, email, phone } = body;

    if (!name) {
      return NextResponse.json({ error: 'Le nom du client est obligatoire.' }, { status: 400 });
    }

    const sql = getDb(); // Instanciation lazy

    await sql`
      INSERT INTO "Client" ("userId", "name", "company", "neq", "address", "email", "phone")
      VALUES (
        ${userId}, 
        ${name}, 
        ${company || null}, 
        ${neq || null}, 
        ${address || null}, 
        ${email || null}, 
        ${phone || null}
      )
    `;

    return NextResponse.json({ message: 'Client ajouté avec succès !' }, { status: 201 });

  } catch (error: any) {
    console.error("❌ Erreur POST /api/clients :", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}