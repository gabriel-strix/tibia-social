"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user && !loading) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <span className="text-zinc-400">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-zinc-950 pt-8">
      <div className="w-full max-w-xl bg-zinc-900 rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-zinc-100 mb-6 text-center flex items-center justify-center gap-2">
          <span>Configurações da Conta</span>
        </h1>
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-200 mb-2">Perfil</h2>
            <form className="flex flex-col gap-4" onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget as HTMLFormElement);
              const name = formData.get('name') as string;
              let photoURL = '';
              const file = formData.get('photoFile') as File;
              if (file && file.size > 0) {
                // Upload para Firebase Storage
                const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
                const storage = getStorage();
                const storageRef = ref(storage, `avatars/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                photoURL = await getDownloadURL(storageRef);
              } else {
                photoURL = (window as any).currentPhotoURL || '';
              }
              const { getAuth, updateProfile } = await import('firebase/auth');
              const auth = getAuth();
              const currentUser = auth.currentUser;
              if (!currentUser) return alert('Usuário não autenticado.');
              await updateProfile(currentUser, { displayName: name, photoURL });
              const { doc, updateDoc } = await import('firebase/firestore');
              const db = (await import('@/lib/firestore')).default;
              await updateDoc(doc(db, 'users', currentUser.uid), { name, photoURL });
              alert('Perfil atualizado com sucesso!');
            }}>
              <label className="flex flex-col gap-1 text-zinc-200">
                Nome:
                <input name="name" type="text" defaultValue={user.displayName || ''} className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-100" required />
              </label>
              <label className="flex flex-col gap-1 text-zinc-200">
                Foto:
                <input name="photoFile" type="file" accept="image/*" className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-100" onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = function(ev) {
                      const img = document.getElementById('avatar-preview') as HTMLImageElement;
                      if (img) img.src = ev.target?.result as string;
                      (window as any).currentPhotoURL = '';
                    };
                    reader.readAsDataURL(file);
                  } else {
                    const img = document.getElementById('avatar-preview') as HTMLImageElement;
                    if (img) img.src = user.photoURL || '/default-avatar.png';
                    (window as any).currentPhotoURL = user.photoURL || '';
                  }
                }} />
                <img id="avatar-preview" src={user.photoURL || '/default-avatar.png'} alt="Foto atual" className="w-16 h-16 rounded-full mt-2 border-2 border-zinc-700" />
              </label>
              <label className="flex flex-col gap-1 text-zinc-200">
                E-mail:
                <input name="email" type="email" value={user.email || ''} className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-400" disabled />
                <span className="text-xs text-zinc-400">Para alterar o e-mail, acesse as configurações de segurança.</span>
              </label>
              <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 w-full">Salvar alterações</button>
            </form>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-200 mb-2">Notificações</h2>
            <form className="flex flex-col gap-3" onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget as HTMLFormElement);
              const prefs = {
                like: formData.get('notif_like') === 'on',
                comment: formData.get('notif_comment') === 'on',
                message: formData.get('notif_message') === 'on',
                follow: formData.get('notif_follow') === 'on',
              };
              const { getAuth } = await import('firebase/auth');
              const auth = getAuth();
              const currentUser = auth.currentUser;
              if (!currentUser) return alert('Usuário não autenticado.');
              const { doc, updateDoc } = await import('firebase/firestore');
              const db = (await import('@/lib/firestore')).default;
              await updateDoc(doc(db, 'users', currentUser.uid), { notificationPrefs: prefs });
              alert('Preferências de notificações salvas!');
            }}>
              <label className="flex items-center gap-2 text-zinc-200">
                <input type="checkbox" name="notif_like" defaultChecked={user?.notificationPrefs?.like ?? true} /> Curtidas
              </label>
              <label className="flex items-center gap-2 text-zinc-200">
                <input type="checkbox" name="notif_comment" defaultChecked={user?.notificationPrefs?.comment ?? true} /> Comentários
              </label>
              <label className="flex items-center gap-2 text-zinc-200">
                <input type="checkbox" name="notif_message" defaultChecked={user?.notificationPrefs?.message ?? true} /> Mensagens
              </label>
              <label className="flex items-center gap-2 text-zinc-200">
                <input type="checkbox" name="notif_follow" defaultChecked={user?.notificationPrefs?.follow ?? true} /> Novos seguidores
              </label>
              <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 w-full mt-2">Salvar preferências</button>
            </form>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-200 mb-2">Privacidade</h2>
            {/* Lista de bloqueados */}
            <div className="mt-4">
              <h3 className="text-md font-semibold text-zinc-300 mb-2">Usuários bloqueados:</h3>
              <ul className="flex flex-col gap-2">
                {(user?.blockedUsers || []).map((uid: string) => (
                  <li key={uid} className="flex items-center gap-2">
                    <span className="text-zinc-100">{uid}</span>
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const { doc, updateDoc, arrayRemove } = await import('firebase/firestore');
                      const authModule = await import('firebase/auth');
                      const auth = authModule.getAuth();
                      const currentUser = auth.currentUser;
                      if (!currentUser) return alert('Usuário não autenticado.');
                      const db = (await import('@/lib/firestore')).default;
                      await updateDoc(doc(db, 'users', currentUser.uid), { blockedUsers: arrayRemove(uid) });
                      alert('Usuário desbloqueado!');
                    }}>
                      <button type="submit" className="px-2 py-1 rounded bg-zinc-700 text-white text-xs hover:bg-zinc-800">Desbloquear</button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-200 mb-2">Conta</h2>
            <button className="px-4 py-2 rounded bg-red-600 text-white font-semibold hover:bg-red-700 w-full mb-2">Excluir conta</button>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-200 mb-2">Aparência</h2>
            <button className="px-4 py-2 rounded bg-zinc-800 text-zinc-100 font-semibold hover:bg-zinc-700 w-full mb-2">Idioma</button>
            <button className="px-4 py-2 rounded bg-zinc-800 text-zinc-100 font-semibold hover:bg-zinc-700 w-full mb-2">Tema</button>
          </div>
        </div>
      </div>
    </div>
  );
}
