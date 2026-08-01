import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { cookies } from 'next/headers';

const sql = neon(process.env.DATABASE_URL!);

// 1. RÉCUPÉRER LES DÉPENSES
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_session')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }

    const expenses = await sql`
      SELECT id, description, amount, category, "createdAt"
      FROM "Expense"
      WHERE "userId" = ${userId}
      ORDER BY "createdAt" DESC
    `;

    return NextResponse.json(expenses, { status: 200 });
  } catch (error: any) {
    console.error("❌ Erreur GET Expenses:", error.message);
    return NextResponse.json([], { status: 200 });
  }
}

// 2. AJOUTER UNE DÉPENSE
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_session')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }

    const body = await request.json();
    const { description, amount, category } = body;

    if (!description || !amount) {
      return NextResponse.json({ error: 'Champs manquants.' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);

    await sql`
      INSERT INTO "Expense" (id, description, amount, category, "userId")
      VALUES (
        gen_random_uuid()::text, 
        ${description}, 
        ${parsedAmount}, 
        ${category || 'Général'}, 
        ${userId}
      )
    `;

    return NextResponse.json({ message: 'Dépense enregistrée avec succès !' }, { status: 201 });
  } catch (error: any) {
    console.error("❌ Erreur POST Expense:", error.message);
    return NextResponse.json({ error: error.message || 'Une erreur interne est survenue.' }, { status: 500 });
  }
}