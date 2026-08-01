import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { cookies } from 'next/headers';

const sql = neon(process.env.DATABASE_URL!);

// 1. RÉCUPÉRER LES CLIENTS
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_session')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }

    const clients = await sql`
      SELECT * FROM "Client"
      WHERE "userId" = ${userId}
      ORDER BY id DESC
    `;

    return NextResponse.json(clients, { status: 200 });
  } catch (error: any) {
    console.error("❌ Erreur GET /api/clients :", error.message);
    return NextResponse.json([], { status: 200 }); // Retourne un tableau vide pour éviter de faire planter le UI
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
    
    // Si c'est juste un ping de vérification de session (body vide)
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const { name, company, neq, address, email, phone } = body;

    if (!name) {
      return NextResponse.json({ error: 'Le nom du client est obligatoire.' }, { status: 400 });
    }

    // Insertion flexible (gère les colonnes existantes)
    await sql`
      INSERT INTO "Client" ("userId", "name", "company", "email")
      VALUES (${userId}, ${name}, ${company || null}, ${email || address || null})
    `;

    return NextResponse.json({ message: 'Client ajouté avec succès !' }, { status: 201 });

  } catch (error: any) {
    console.error("❌ Erreur POST /api/clients :", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}