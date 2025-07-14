export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "Nome do personagem é obrigatório." }, { status: 400 });
    }
    const data = await fetchTibiaCharacterInfo(name);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro ao buscar personagem." }, { status: 404 });
  }
}
import { NextRequest, NextResponse } from "next/server";
import { fetchTibiaCharacterInfo } from "@/lib/tibiaScraper";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "Nome do personagem é obrigatório." }, { status: 400 });
  }
  try {
    const data = await fetchTibiaCharacterInfo(name);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro ao buscar personagem." }, { status: 404 });
  }
}
