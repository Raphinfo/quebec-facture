import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { apiError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
export async function GET() {
  try {
    const id = await requireUser();
    await rateLimit(`export:${id}`, 5, 3600);
    const sql = getDb();
    const data = await sql.transaction(
      [
        sql`SELECT email,"companyName","companyAddress","companyLogo",neq,address,"tpsNumber","tvqNumber" FROM "User" WHERE id=${id}`,
        sql`SELECT * FROM "Client" WHERE "userId"=${id}`,
        sql`SELECT * FROM "Invoice" WHERE "userId"=${id}`,
        sql`SELECT * FROM "Quote" WHERE "userId"=${id}`,
        sql`SELECT * FROM "Expense" WHERE "userId"=${id}`,
      ],
      { isolationLevel: "RepeatableRead", readOnly: true },
    );
    return NextResponse.json(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        profile: data[0][0],
        clients: data[1],
        invoices: data[2],
        quotes: data[3],
        expenses: data[4],
      },
      {
        headers: {
          "Content-Disposition":
            'attachment; filename="quebec-facture-export.json"',
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    return apiError(error);
  }
}
