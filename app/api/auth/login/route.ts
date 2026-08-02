import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

// Indiquer à Next.js/Vercel de ne pas pré-évaluer cette route au build
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Fallback sécurisé pour empêcher le crash au moment du build Next.js / Vercel
const dbUrl = process.env.DATABASE_URL || 'postgres://placeholder:placeholder@localhost:5432/db';
const sql = neon(dbUrl);

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 });
    }

    console.log("=== TENTATIVE DE CONNEXION CÔTÉ SERVEUR ===");

    // 1. Chercher l'utilisateur par e-mail
    const users = await sql`SELECT * FROM "User" WHERE email = ${email}`;

    if (users.length === 0) {
      return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 });
    }

    const user = users[0];

    // 2. Vérifier le mot de passe haché avec Bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 });
    }

    console.log("=== CONNEXION RÉUSSIE POUR :", user.email);

    // Création de la réponse
    const response = NextResponse.json({
      message: 'Connexion réussie',
      user: { id: user.id, email: user.email }
    }, { status: 200 });

    // Stockage de l'ID utilisateur dans un cookie sécurisé (7 jours)
    response.cookies.set('user_session', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;

  } catch (error: any) {
    console.error("=== ERREUR CRITIQUE LOGIN ===");
    console.error("Message :", error.message);
    return NextResponse.json({ error: 'Une erreur interne est survenue' }, { status: 500 });
  }
}