// src/app/api/teste-firebase/route.ts
import { NextResponse } from "next/server";
import firebaseApp from "../../../lib/firebase";

export async function GET() {
  try {
    // Apenas retorna que o Firebase foi iniciado com sucesso
    return NextResponse.json({ status: "ok", firebase: firebaseApp.name });
  } catch (error) {
    return NextResponse.json({ status: "erro", error: String(error) });
  }
}
