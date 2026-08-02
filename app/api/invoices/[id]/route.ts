import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// 1. MODIFICATION DU STATUT
export async function PATCH(
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
    const invoiceId = resolvedParams.id;
    const { status } = await request.json();

    if (!status) {
      return NextResponse.json({ error: 'Statut manquant.' }, { status: 400 });
    }

    const sql = getDb(); // Instanciation lazy à la volée

    await sql`
      UPDATE "Invoice"
      SET "status" = ${status}
      WHERE "id" = ${invoiceId} AND "userId" = ${userId}
    `;

    return NextResponse.json({ message: 'Statut mis à jour avec succès !' }, { status: 200 });

  } catch (error: any) {
    console.error("Erreur modification statut facture :", error.message);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}

// 2. SUPPRESSION SÉCURISÉE DE LA FACTURE
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
    const invoiceId = resolvedParams.id;

    const sql = getDb(); // Instanciation lazy à la volée

    const result = await sql`
      DELETE FROM "Invoice"
      WHERE "id" = ${invoiceId} AND "userId" = ${userId}
      RETURNING "invoiceNumber"
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Facture introuvable ou non autorisée.' }, { status: 404 });
    }

    return NextResponse.json({ message: `Facture ${result[0].invoiceNumber} supprimée.` }, { status: 200 });

  } catch (error: any) {
    console.error("❌ ERREUR API INVOICE (DELETE) :", error.message);
    return NextResponse.json({ error: 'Une erreur interne est survenue lors de la suppression.' }, { status: 500 });
  }
}