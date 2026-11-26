import { NextRequest, NextResponse } from "next/server";
export function proxy(request: NextRequest) {
  if (
    request.nextUrl.pathname.startsWith("/api/") &&
    !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
    request.nextUrl.pathname !== "/api/webhook/stripe"
  ) {
    const origin = request.headers.get("origin");
    if (process.env.NODE_ENV === "production" && !process.env.APP_URL)
      return NextResponse.json(
        { error: "Service temporairement indisponible." },
        { status: 503 },
      );
    const expected = process.env.APP_URL
      ? new URL(process.env.APP_URL).origin
      : new URL(
          `${request.nextUrl.protocol}//${request.headers.get("host") || request.nextUrl.host}`,
        ).origin;
    if (
      !origin ||
      origin !== expected ||
      request.headers.get("sec-fetch-site") === "cross-site"
    ) {
      return NextResponse.json(
        { error: "Origine de la requête non autorisée." },
        { status: 403 },
      );
    }
  }
  const response = NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/"))
    response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = { matcher: ["/api/:path*"] };
