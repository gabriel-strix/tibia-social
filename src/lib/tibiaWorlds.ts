// Lista de mundos do Tibia (atualize periodicamente)
// Para atualização automática, veja a função fetchTibiaWorlds abaixo.

export const TIBIA_WORLDS: string[] = [
  "Aethera", "Ambra", "Antica", "Astera", "Belobra", "Bona", "Bravoria", "Calmera", "Celebra", "Celesta", "Damora", "Descubra", "Epoca", "Esmera", "Etebra", "Ferobra", "Firmera", "Gentebra", "Gladera", "Gravitera", "Guerribra", "Harmonia", "Honbra", "Impulsa", "Inabra", "Jacabra", "Kalibra", "Lobera", "Luminera", "Lutabra", "Menera", "Monza", "Mykera", "Nefera", "Obscubra", "Ombra", "Pacera", "Peloria", "Premia", "Quelibra", "Quintera", "Refugia", "Relania", "Secura", "Serdebra", "Solidera", "Talera", "Thyria", "Tornabra", "Utobra", "Venebra", "Vunira", "Wintera", "Wizera", "Yonabra"
];

// Função para buscar mundos do site oficial do Tibia (https://www.tibia.com/community/?subtopic=worlds)
// Uso: fetchTibiaWorlds().then(worlds => ...)
export async function fetchTibiaWorlds(): Promise<string[]> {
  const res = await fetch("https://www.tibia.com/community/?subtopic=worlds");
  const html = await res.text();
  // Regex para extrair nomes dos mundos da tabela
  const matches = [...html.matchAll(/<a href="\?subtopic=worlds&world=(.*?)">/g)];
  return matches.map(m => decodeURIComponent(m[1]));
}
