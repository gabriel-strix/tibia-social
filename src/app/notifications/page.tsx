"use client";

// Página de notificações estilo Instagram
export default function NotificationsPage() {
  // Exemplo de notificações estáticas (substitua por busca real depois)
  const mockNotifications = [
    { id: 1, text: "Knightzera começou a seguir você.", type: "follow", user: { name: "Knightzera", photoURL: "/default-avatar.png" } },
    { id: 2, text: "SorcererX curtiu seu post.", type: "like", user: { name: "SorcererX", photoURL: "/default-avatar.png" } },
    { id: 3, text: "Druidinha comentou: 'Parabéns pelo up!'", type: "comment", user: { name: "Druidinha", photoURL: "/default-avatar.png" } },
  ];

  return (
    <div className="flex justify-center w-full min-h-screen bg-zinc-950 pt-4">
      <div className="w-full max-w-xl flex flex-col gap-8 mt-4">
        <h1 className="text-2xl font-bold mb-6 text-zinc-100 text-center">Notificações</h1>
        <div className="flex flex-col gap-4">
          {mockNotifications.map((n) => (
            <div key={n.id} className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-lg p-4 shadow">
              <img src={n.user.photoURL} alt={n.user.name} className="w-12 h-12 rounded-full border-2 border-zinc-700" />
              <span className="text-zinc-100 text-base">{n.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
