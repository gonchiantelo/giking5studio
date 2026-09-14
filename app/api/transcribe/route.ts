import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY no configurada en el servidor." }, { status: 500 });
    }

    // Whisper supports up to 25MB.
    // Transcribe with word-level timestamps.
    const response = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Whisper Error:", error);
    if (error?.status === 402 || (error?.message && error.message.toLowerCase().includes("quota"))) {
      return NextResponse.json({ error: "Quota exceeded" }, { status: 402 });
    }
    return NextResponse.json({ error: error?.message || "Failed to transcribe" }, { status: error?.status || 500 });
  }
}
