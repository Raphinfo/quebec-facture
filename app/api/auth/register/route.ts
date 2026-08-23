import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Champs manquants' },
        { status: 400 }
      );
    }

    // Normaliser l'adresse email
    const normalizedEmail = email.trim().toLowerCase();

    console.log('=== INSCRIPTION VIA DRIVER NATIF NEON SQL ===');

    const sql = getDb();

    // Vérifier si l'utilisateur existe déjà
    const users = await sql`
      SELECT id
      FROM "User"
      WHERE LOWER(email) = ${normalizedEmail}
      LIMIT 1
    `;

    if (users.length > 0) {
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé' },
        { status: 400 }
      );
    }

    // Hachage du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // UUID utilisateur
    const userId = crypto.randomUUID();

    const result = await sql`
  INSERT INTO "User" (id, email, password)
  VALUES (${userId}, ${email}, ${hashedPassword})
  RETURNING id, email
`;

console.log(
  "=== SUCCÈS SQL NATIF : Utilisateur inséré :",
  result[0]
);

const response = NextResponse.json(
  {
    message: 'Utilisateur créé avec succès',
    userId: result[0].id
  },
  { status: 201 }
);

response.cookies.set('user_session', result[0].id, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 7,
});

return response;
    // IMPORTANT :
    // connecter automatiquement l'utilisateur après son inscription
    response.cookies.set(
      'user_session',
      result[0].id,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 jours
        path: '/',
      }
    );

    return response;

  } catch (error: any) {
    console.error('=== ERREUR CRITIQUE SQL BRUT ===');
    console.error('Message :', error.message);

    return NextResponse.json(
      {
        error: 'Une erreur interne est survenue',
        details: error.message,
      },
      { status: 500 }
    );
  }
}