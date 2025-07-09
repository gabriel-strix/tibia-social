import ChatList from "@/components/ChatList";

export default function ChatPage() {
  return (
    <main className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-zinc-100 mb-4">Mensagens</h1>
      <ChatList />
    </main>
  );
}
