import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "OpenAI temporalmente deshabilitado." },
    { status: 501 }
  );
}
