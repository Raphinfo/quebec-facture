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

    // Resolution hybride du paramètre id
    const resolvedParams = await params;
    const clientId = resolvedParams.id;

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