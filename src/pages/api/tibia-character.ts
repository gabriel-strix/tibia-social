import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Nome é obrigatório" });

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
    return res.status(404).json({ error: "Personagem não encontrado ou página mudou.", debug: html.slice(0, 1000) });
  }

  return res.status(200).json({
    level: Number(levelMatch[1]),
    vocation: vocationMatch[1].trim(),
    world: worldMatch[1].trim(),
  });
}
