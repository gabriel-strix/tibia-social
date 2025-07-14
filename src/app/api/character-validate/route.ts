import { NextRequest, NextResponse } from "next/server";
import { fetchTibiaCharacterInfo } from "@/lib/tibiaScraper";

export async function POST(req: NextRequest) {
  const { name, code } = await req.json();
  if (!name || !code) {
    return NextResponse.json({ error: "Nome e código são obrigatórios." }, { status: 400 });
  }
  try {
    const data = await fetchTibiaCharacterInfo(name, true); // true = retorna comment
    if (!data.comment || !data.comment.includes(code)) {
      return NextResponse.json({ error: "Código não encontrado no comentário do personagem." }, { status: 403 });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro ao buscar personagem." }, { status: 404 });
  }
}
