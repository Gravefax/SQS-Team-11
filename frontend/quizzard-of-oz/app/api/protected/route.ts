import { NextRequest, NextResponse } from "next/server";

const VALID_TOKEN = process.env.API_SECRET ?? "secret-token";

export function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");

  if (!auth || auth !== `Bearer ${VALID_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ data: "protected content" }, { status: 200 });
}
