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
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }

    const sql = getDb();

    try {
      // 🟢 AJOUT DE "plan" DANS LE SELECT SQL
      const users = await sql`
        SELECT "companyName", "companyAddress", "tpsNumber", "tvqNumber", "companyLogo", "subscriptionStatus", "plan"
        FROM "User"
        WHERE id = ${userId}
        LIMIT 1
      `;

      if (users && users.length > 0) {
        return NextResponse.json({
          ...users[0],
          subscriptionStatus: users[0].subscriptionStatus || 'ACTIVE',
          plan: users[0].plan || 'FREE' // 👈 Renvoie le plan ('FREE' par défaut s'il est vide)
        }, { status: 200 });
      }
    } catch (sqlError: any) {
      console.warn("⚠️ Erreur SQL GET /api/profile :", sqlError.message);
      
      const basicUsers = await sql`
        SELECT "companyName", "companyAddress", "tpsNumber", "tvqNumber"
        FROM "User"
        WHERE id = ${userId}
        LIMIT 1
      `;

      return NextResponse.json({
        ...(basicUsers[0] || {}),
        subscriptionStatus: 'ACTIVE',
        plan: 'FREE'
      }, { status: 200 });
    }

    return NextResponse.json({ subscriptionStatus: 'ACTIVE', plan: 'FREE' }, { status: 200 });

  } catch (error: any) {
    console.error("❌ Erreur serveur GET /api/profile :", error.message);
    return NextResponse.json({ subscriptionStatus: 'ACTIVE', plan: 'FREE' }, { status: 200 });
  }
}

// 2. METTRE À JOUR LES INFOS DU PROFIL (Inclus companyLogo)
export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_session')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }

    const body = await request.json();
    const { companyName, companyAddress, tpsNumber, tvqNumber, companyLogo } = body;

    const sql = getDb();

    await sql`
      UPDATE "User"
      SET 
        "companyName" = ${companyName || null},
        "companyAddress" = ${companyAddress || null},
        "tpsNumber" = ${tpsNumber || null},
        "tvqNumber" = ${tvqNumber || null},
        "companyLogo" = ${companyLogo || null}
      WHERE id = ${userId}
    `;

    return NextResponse.json({ message: 'Profil mis à jour avec succès !' }, { status: 200 });

  } catch (error: any) {
    console.error("❌ Erreur PUT /api/profile :", error.message);
    return NextResponse.json({ error: error.message || 'Erreur lors de la sauvegarde.' }, { status: 500 });
  }
}