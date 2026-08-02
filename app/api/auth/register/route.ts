import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getDb } from '@/lib/db'; // 👈 On utilise le helper lazy-loading

// Empêche Next.js d'évaluer la route statiquement au moment du build
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 });
    }

    console.log("=== INSCRIPTION VIA DRIVER NATIF NEON SQL ===");

    // Instanciation de la DB uniquement lors de l'exécution de la requête
    const sql = getDb();

    // 1. Recherche de l'utilisateur existant
    const users = await sql`SELECT * FROM "User" WHERE email = ${email}`;
    
    if (users.length > 0) {
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 400 });
    }

    // 2. Hachage du mot de passe avec bcryptjs
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Génération d'un UUID unique pour la colonne "id"
    const userId = crypto.randomUUID();

    // 4. Insertion brute en incluant l'id généré
    const result = await sql`
      INSERT INTO "User" (id, email, password) 
      VALUES (${userId}, ${email}, ${hashedPassword}) 
      RETURNING id, email
    `;

    console.log("=== SUCCÈS SQL NATIF : Utilisateur inséré :", result[0]);

    return NextResponse.json({ message: 'Utilisateur créé avec succès', userId: result[0].id }, { status: 201 });
  } catch (error: any) {
    console.error("=== ERREUR CRITIQUE SQL BRUT ===");
    console.error("Message :", error.message);
    return NextResponse.json({ error: 'Une erreur interne est survenue', details: error.message }, { status: 500 });
  }
}