import { NextResponse } from "next/server";

export async function POST(req: Request) {
  return NextResponse.json(
    { error: "Función de auto-subtítulos deshabilitada temporalmente." }, 
    { status: 501 }
  );
}
