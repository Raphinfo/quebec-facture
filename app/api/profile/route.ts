import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// Helper pour récupérer l'instance Neon à l'exécution de la requête uniquement
function getDb() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL n'est pas définie dans les variables d'environnement.");
  }
  return neon(dbUrl);
}

// 1. RÉCUPÉRER LES INFOS DU PROFIL
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_session')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'Non autorisé.' },
        { status: 401 }
      );
    }

    const sql = getDb();

    const users = await sql`
      SELECT
        id,
        email,
        "companyName",
        "companyAddress",
        "tpsNumber",
        "tvqNumber",
        "companyLogo",
        "subscriptionStatus",
        "plan"
      FROM "User"
      WHERE id = ${userId}
      LIMIT 1
    `;

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: 'Session invalide.' },
        { status: 401 }
      );
    }

    const user = users[0];

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        companyName: user.companyName || '',
        companyAddress: user.companyAddress || '',
        tpsNumber: user.tpsNumber || '',
        tvqNumber: user.tvqNumber || '',
        companyLogo: user.companyLogo || '',
        subscriptionStatus: user.subscriptionStatus || null,
        plan: user.plan || 'FREE',
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error(
      '❌ Erreur serveur GET /api/profile :',
      error.message
    );

    return NextResponse.json(
      { error: 'Erreur serveur.' },
      { status: 500 }
    );
  }
}