// Função utilitária para buscar e extrair informações de personagem do Tibia.com
export async function fetchTibiaCharacterInfo(characterName: string) {
  const url = `https://www.tibia.com/community/?subtopic=characters&name=${encodeURIComponent(characterName)}`;
  const response = await fetch(url);
  const html = await response.text();

  // Regex simples para extrair informações básicas
  const levelMatch = html.match(/<td>Level:<\/td>\s*<td>(\d+)<\/td>/);
  const vocationMatch = html.match(/<td>Vocation:<\/td>\s*<td>([^<]+)<\/td>/);
  const worldMatch = html.match(/<td>World:<\/td>\s*<td>([^<]+)<\/td>/);

  if (!levelMatch || !vocationMatch || !worldMatch) {
    throw new Error("Personagem não encontrado ou página mudou.");
  }

  return {
    level: Number(levelMatch[1]),
    vocation: vocationMatch[1].trim(),
    world: worldMatch[1].trim(),
  };
}
