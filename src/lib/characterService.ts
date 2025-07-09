import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import db from "./firestore";

export interface Character {
  name: string;
  level: number;
  vocation: string;
  world: string;
  type: 'main' | 'maker';
}

export async function addCharacter(userId: string, characterData: Character): Promise<void> {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    characters: arrayUnion(characterData)
  });
}

export async function updateCharacter(userId: string, characterName: string, updatedData: Partial<Character>): Promise<void> {
  const userRef = doc(db, "users", userId);
  const docSnap = await getDoc(userRef);

  if (docSnap.exists()) {
    const userData = docSnap.data();
    const characters: Character[] = userData.characters || [];
    const updatedCharacters = characters.map(char =>
      char.name === characterName ? { ...char, ...updatedData } : char
    );
    await updateDoc(userRef, { characters: updatedCharacters });
  }
}

export async function deleteCharacter(userId: string, characterName: string): Promise<void> {
  const userRef = doc(db, "users", userId);
  const docSnap = await getDoc(userRef);

  if (docSnap.exists()) {
    const userData = docSnap.data();
    const characters: Character[] = userData.characters || [];
    const characterToRemove = characters.find(char => char.name === characterName);

    if (characterToRemove) {
      await updateDoc(userRef, {
        characters: arrayRemove(characterToRemove)
      });
    }
  }
}
