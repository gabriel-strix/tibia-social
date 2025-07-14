// Função utilitária para buscar e extrair informações de personagem do Tibia.com
export async function fetchTibiaCharacterInfo(characterName: string, withComment = false) {
  const url = `https://www.tibia.com/community/?subtopic=characters&name=${encodeURIComponent(characterName)}`;
  const response = await fetch(url);
  const html = await response.text();
  // console.log('HTML Tibia.com:', html.slice(0, 2000));

  const levelMatch = html.match(/<td[^>]*class="LabelV175"[^>]*>\s*Level:\s*<\/td>\s*<td[^>]*>(\d+)<\/td>/i);
  const vocationMatch = html.match(/<td[^>]*class="LabelV175"[^>]*>\s*Vocation:\s*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i);
  const worldMatch = html.match(/<td[^>]*class="LabelV175"[^>]*>\s*World:\s*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i);
  let comment = undefined;
  if (withComment) {
    const commentMatch = html.match(/<td[^>]*class="LabelV175"[^>]*>\s*Comment:\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
    if (commentMatch) {
      // Remove tags html e converte <br> em \n
      comment = commentMatch[1].replace(/<br\s*\/?>(\s*)?/gi, '\n').replace(/<[^>]+>/g, '').trim();
    }
  }

  if (!levelMatch || !vocationMatch || !worldMatch) {
    // console.error('Regex não encontrou dados. HTML:', html.slice(0, 2000));
    throw new Error("Personagem não encontrado ou página mudou.");
  }

  const result: any = {
    level: Number(levelMatch[1]),
    vocation: vocationMatch[1].trim(),
    world: worldMatch[1].trim(),
  };
  if (withComment) result.comment = comment;
  return result;
}
