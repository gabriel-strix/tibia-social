import React from "react";

export default function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      title="Conta verificada"
      className={`inline-flex items-center justify-center ml-1 align-middle ${className}`}
      style={{ verticalAlign: "middle" }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="10" fill="#3797F0" />
        <path d="M6.5 10.5L9 13L13.5 8.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
