import { NextResponse } from "next/server";
import { revokeSession, SESSION_COOKIE } from "@/lib/session";
import { apiError } from "@/lib/http";
export async function POST(request: Request) {
  try {
    await revokeSession();
    const response = NextResponse.redirect(new URL("/login", request.url), 303);
    response.cookies.delete(SESSION_COOKIE);
    response.cookies.delete("user_session");
    return response;
  } catch (error) {
    return apiError(error);
  }
}
