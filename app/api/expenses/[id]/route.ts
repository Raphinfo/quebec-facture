import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const sql = neon(process.env.DATABASE_URL!);

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_session')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }

    // Extraction sécurisée des paramètres
    const resolvedParams = await params;
    const expenseId = resolvedParams.id;

    const result = await sql`
      DELETE FROM "Expense"
      WHERE "id" = ${expenseId} AND "userId" = ${userId}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Dépense introuvable.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Dépense supprimée avec succès.' }, { status: 200 });
  } catch (error: any) {
    console.error("Erreur DELETE Expense:", error.message);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}