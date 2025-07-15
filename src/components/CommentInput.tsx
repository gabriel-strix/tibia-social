import React, { useState, useRef } from "react";
import UserSearchBar from "./UserSearchBar";

interface CommentInputProps {
  value: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
}

export default function CommentInput({ value, onChange, onSubmit }: CommentInputProps) {
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Detecta @ e ativa busca de usuário
  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    const cursor = e.target.selectionStart;
    const match = /@([\w]*)$/.exec(text.slice(0, cursor));
    if (match) {
      setShowUserSearch(true);
      setMentionQuery(match[1]);
      setMentionStart(cursor - match[1].length - 1);
    } else {
      setShowUserSearch(false);
      setMentionQuery("");
      setMentionStart(null);
    }
    onChange(text);
  }

  // Insere menção formatada
  function handleSelectUser(user: any) {
    if (mentionStart === null || !textareaRef.current) return;
    const before = value.slice(0, mentionStart);
    const after = value.slice(textareaRef.current.selectionStart);
    const mention = `@${user.username} `;
    const newText = before + mention + after;
    onChange(newText);
    setShowUserSearch(false);
    setMentionQuery("");
    setMentionStart(null);
    // Move cursor após menção
    setTimeout(() => {
      textareaRef.current!.focus();
      textareaRef.current!.setSelectionRange(before.length + mention.length, before.length + mention.length);
    }, 0);
  }

  return (
    <div className="relative w-full">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        rows={2}
        className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        placeholder="Escreva um comentário... use @ para mencionar alguém"
      />
      {showUserSearch && (
        <div className="absolute left-0 top-full z-10 w-full bg-zinc-900 border border-zinc-700 rounded shadow-lg">
          <UserSearchBar onSelect={handleSelectUser} search={mentionQuery} />
        </div>
      )}
      <button
        type="button"
        className="mt-2 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold"
        onClick={onSubmit}
      >Enviar</button>
    </div>
  );
}
