import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 });
    }

    const sql = getDb();
    const users = await sql`SELECT * FROM "User" WHERE email = ${email}`;

    if (users.length === 0) {
      return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 });
    }

    const response = NextResponse.json({
      message: 'Connexion réussie',
      user: { id: user.id, email: user.email }
    }, { status: 200 });

    response.cookies.set('user_session', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error("=== ERREUR CRITIQUE LOGIN ===", error.message);
    return NextResponse.json({ error: 'Une erreur interne est survenue' }, { status: 500 });
  }
}