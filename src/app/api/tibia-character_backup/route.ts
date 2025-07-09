import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });

  const url = `https://www.tibia.com/community/?subtopic=characters&name=${encodeURIComponent(name)}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"
    }
  });
  const html = await response.text();

  const levelMatch = html.match(/<td>Level:<\/td>\s*<td>(\d+)<\/td>/);
  const vocationMatch = html.match(/<td>Vocation:<\/td>\s*<td>([^<]+)<\/td>/);
  const worldMatch = html.match(/<td>World:<\/td>\s*<td>([^<]+)<\/td>/);

  if (!levelMatch || !vocationMatch || !worldMatch) {
    // Para debug, envie parte do HTML de volta
    return NextResponse.json({ error: "Personagem não encontrado ou página mudou.", debug: html.slice(0, 1000) }, { status: 404 });
  }

  return NextResponse.json({
    level: Number(levelMatch[1]),
    vocation: vocationMatch[1].trim(),
    world: worldMatch[1].trim(),
  });
}
