import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

// Fallback sécurisé pour empêcher le crash "Failed to collect page data" lors du build Vercel
const dbUrl = process.env.DATABASE_URL || 'postgres://placeholder:placeholder@localhost:5432/db';
const sql = neon(dbUrl);

// 1. CRÉATION D'UNE FACTURE
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_session')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }

    // 🔒 VÉRIFICATION DU PLAN UTILISATEUR & DE LA LIMITE DE FACTURES
    const userResult = await sql`
      SELECT plan FROM "User" WHERE id = ${userId} LIMIT 1
    `;
    const userPlan = userResult[0]?.plan || 'FREE';

    if (userPlan === 'FREE') {
      const countResult = await sql`
        SELECT COUNT(*) as count FROM "Invoice" WHERE "userId" = ${userId}
      `;
      const currentInvoiceCount = parseInt(countResult[0]?.count || '0', 10);

      if (currentInvoiceCount >= 3) {
        return NextResponse.json(
          { error: 'Limite du plan Essai atteinte (3 factures maximum). Passez au Plan Pro pour créer des factures illimitées !' },
          { status: 403 }
        );
      }
    }

    const { clientId, items } = await request.json();

    if (!clientId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Données manquantes ou aucun service renseigné.' }, { status: 400 });
    }

    const parsedClientId = typeof clientId === 'string' ? parseInt(clientId, 10) : clientId;

    // Récupération des infos du client
    const clientData = await sql`
      SELECT name, company FROM "Client"
      WHERE id = ${parsedClientId} AND "userId" = ${userId}
      LIMIT 1
    `;

    const clientName = clientData[0]?.name || 'Client';
    const clientCompany = clientData[0]?.company || null;

    // Calcul du sous-total
    const subtotal = items.reduce((sum: number, item: any) => {
      const itemAmount = parseFloat(item.amount) || 0;
      return sum + itemAmount;
    }, 0);

    if (subtotal <= 0) {
      return NextResponse.json({ error: 'Le montant total de la facture doit être supérieur à 0 $.' }, { status: 400 });
    }

    // Calculs des taxes du Québec (TPS 5% et TVQ 9.975%)
    const tps = Math.round((subtotal * 0.05) * 100) / 100;
    const tvq = Math.round((subtotal * 0.09975) * 100) / 100;
    const total = Math.round((subtotal + tps + tvq) * 100) / 100;

    const invoiceId = uuidv4();
    const invoiceNumber = `FAC-${Date.now().toString().slice(-6)}`;
    const jsonString = JSON.stringify(items);

    // Insertion PostgreSQL incluant "totalGlobal"
    await sql`
      INSERT INTO "Invoice" (
        "id", 
        "number", 
        "amountSubtotal", 
        "sousTotal",
        "tpsAmount", 
        "totalTPS",
        "tvqAmount", 
        "totalTVQ",
        "amountTotal",
        "totalGlobal",
        "status", 
        "clientId", 
        "clientName",
        "clientCompany",
        "userId",
        "itemsJson",
        "items"
      )
      VALUES (
        ${invoiceId}, 
        ${invoiceNumber}, 
        ${subtotal}, 
        ${subtotal},
        ${tps}, 
        ${tps},
        ${tvq}, 
        ${tvq},
        ${total},
        ${total},
        'PENDING', 
        ${parsedClientId}, 
        ${clientName},
        ${clientCompany},
        ${userId},
        ${jsonString},
        ${jsonString}::jsonb
      )
    `;

    return NextResponse.json({ message: 'Facture générée !', invoiceNumber, total }, { status: 201 });

  } catch (error: any) {
    console.error("❌ ERREUR BACKEND INVOICE (POST) :", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. RÉCUPÉRATION DES FACTURES
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_session')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }

    const invoices = await sql`
      SELECT 
        i.id, 
        i."number" as "invoiceNumber", 
        COALESCE(i."amountSubtotal", i."sousTotal", 0) as "amountSubtotal", 
        COALESCE(i."tpsAmount", i."totalTPS", 0) as "tpsAmount", 
        COALESCE(i."tvqAmount", i."totalTVQ", 0) as "tvqAmount", 
        COALESCE(i."amountTotal", i."totalGlobal", 0) as "amountTotal", 
        i.status,
        i.items as "rawItems",
        i."itemsJson" as "rawItemsJson",
        i."createdAt",
        COALESCE(c.name, i."clientName", 'Client inconnu') as "clientName",
        COALESCE(c.company, i."clientCompany", '') as "clientCompany",
        u."companyName" as "userCompanyName",
        u."companyAddress" as "userCompanyAddress",
        u."tpsNumber" as "userTpsNumber",
        u."tvqNumber" as "userTvqNumber",
        u."companyLogo" as "userCompanyLogo"
      FROM "Invoice" i
      LEFT JOIN "Client" c ON i."clientId" = c.id
      LEFT JOIN "User" u ON i."userId" = u.id
      WHERE i."userId" = ${userId}
      ORDER BY i."createdAt" DESC
    `;

    // Normalisation propre en JS pour éviter les erreurs de typage PostgreSQL
    const formattedInvoices = invoices.map((inv: any) => {
      let itemsData = inv.rawItems || inv.rawItemsJson || '[]';
      
      if (typeof itemsData === 'string') {
        try {
          itemsData = JSON.parse(itemsData);
        } catch {
          itemsData = [];
        }
      }

      return {
        ...inv,
        items: itemsData
      };
    });

    return NextResponse.json(formattedInvoices, { status: 200 });

  } catch (error: any) {
    console.error("❌ ERREUR BACKEND INVOICE (GET) :", error.message);
    return NextResponse.json([], { status: 200 });
  }
}