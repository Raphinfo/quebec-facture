import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

    // Résolution hybride du paramètre id (Next.js 15+)
    const resolvedParams = await params;
    const clientId = resolvedParams.id;

    // Instance DB exécutée uniquement lors de l'appel de la route
    const sql = getDb();

    await sql`
      DELETE FROM "Client" 
      WHERE "id" = ${clientId} AND "userId" = ${userId}
    `;

    return NextResponse.json({ message: 'Client supprimé avec succès !' }, { status: 200 });

  } catch (error: any) {
    console.error("Erreur suppression client :", error.message);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}