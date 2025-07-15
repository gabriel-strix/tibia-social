"use client";

import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Spinner from "@/components/Spinner";

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (!user && !loading) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <Spinner />
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
          <div className="relative">
            <h2 className="text-lg font-semibold text-zinc-200 mb-2">Perfil</h2>
            <form className="flex flex-col gap-4" onSubmit={async (e) => {
              e.preventDefault();
              setUploading(true);
              setUploadProgress(0);
              try {
                const formData = new FormData(e.currentTarget as HTMLFormElement);
                const name = formData.get('name') as string;
                let photoURL = '';
                const file = formData.get('photoFile') as File;
                if (file && file.size > 0) {
                  // Upload para Firebase Storage com barra de progresso
                  const { getStorage, ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');
                  const storage = getStorage();
                  const storageRef = ref(storage, `avatars/${Date.now()}_${file.name}`);
                  const uploadTask = uploadBytesResumable(storageRef, file);
                  await new Promise((resolve, reject) => {
                    uploadTask.on('state_changed',
                      (snapshot) => {
                        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                        setUploadProgress(progress);
                      },
                      (error) => reject(error),
                      () => resolve(null)
                    );
                  });
                  photoURL = await getDownloadURL(storageRef);
                } else {
                  // Usa a foto atual do usuário se não houver upload novo
                  photoURL = user.photoURL || '';
                }
                const { getAuth, updateProfile } = await import('firebase/auth');
                const auth = getAuth();
                const currentUser = auth.currentUser;
                if (!currentUser) { setUploading(false); return alert('Usuário não autenticado.'); }
                await updateProfile(currentUser, { displayName: name, photoURL });
                const { doc, updateDoc, collection, getDocs, query, where } = await import('firebase/firestore');
                const db = (await import('@/lib/firestore')).default;
                const username = formData.get('username') as string;
                // Verifica se o username já existe para outro usuário
                if (username) {
                  const q = query(collection(db, 'users'), where('username', '==', username));
                  const snap = await getDocs(q);
                  if (!snap.empty && snap.docs.some(d => d.id !== currentUser.uid)) {
                    setUploading(false);
                    alert('Nome de usuário já está em uso. Escolha outro.');
                    return;
                  }
                }
                await updateDoc(doc(db, 'users', currentUser.uid), { name, photoURL, username });
                // Atualiza a foto de perfil e nome em todos os posts do usuário
                const { collection: postsCollection, getDocs: getPostsDocs, updateDoc: updatePostDoc, doc: postDoc } = await import('firebase/firestore');
                const postsSnap = await getPostsDocs(postsCollection(db, 'posts'));
                for (const post of postsSnap.docs) {
                  if (post.data().uid === currentUser.uid) {
                    await updatePostDoc(postDoc(db, 'posts', post.id), { photoURL, name, username });
                  }
                }
                alert('Perfil atualizado com sucesso!');
                window.location.reload();
              } catch (err) {
                alert('Erro ao atualizar perfil: ' + (err as Error).message);
              } finally {
                setUploading(false);
              }
            }}>
              <label className="flex flex-col gap-1 text-zinc-200">
                Nome:
                <input name="name" type="text" defaultValue={user.displayName || ''} className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-100" required />
              </label>
              <label className="flex flex-col gap-1 text-zinc-200">
                Foto:
                <input name="photoFile" type="file" accept="image/*" className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-100" onChange={e => {
                  const file = e.target.files?.[0];
                  setUploadProgress(0);
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
                {uploading && uploadProgress > 0 && uploadProgress < 100 && (
                  <progress value={uploadProgress} max={100} className="w-full h-2 mt-2 bg-zinc-800 rounded overflow-hidden">
                    {uploadProgress}%
                  </progress>
                )}
                <Image
                  id="avatar-preview"
                  src={user.photoURL || '/default-avatar.png'}
                  alt="Foto atual"
                  width={96}
                  height={96}
                  className="w-24 h-24 rounded-full object-cover border-2 border-zinc-700 mt-2"
                  priority
                />
              </label>
              <label className="flex flex-col gap-1 text-zinc-200">
                E-mail:
                <input name="email" type="email" value={user.email || ''} className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-400" disabled />
                <span className="text-xs text-zinc-400">Para alterar o e-mail, acesse as configurações de segurança.</span>
              </label>
              <label className="flex flex-col gap-1 text-zinc-200">
                Nome de usuário:
                <input
                  name="username"
                  type="text"
                  pattern="^[a-zA-Z0-9.,-]+$"
                  title="Use apenas letras, números, ponto, vírgula e traço."
                  defaultValue={user.username || ''}
                  className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-100"
                  required
                />
                <span className="text-xs text-zinc-400">Use apenas letras, números, ponto, vírgula e traço. Deve ser único.</span>
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
            <button
              className="px-4 py-2 rounded bg-red-600 text-white font-semibold hover:bg-red-700 w-full mb-2"
              onClick={async () => {
                if (!window.confirm("Tem certeza que deseja excluir sua conta? Esta ação é irreversível e todos os seus dados serão apagados permanentemente.")) return;
                const { deleteUserAccount } = await import("@/lib/userService");
                try {
                  await deleteUserAccount(user.uid);
                  alert("Conta excluída com sucesso. Você será redirecionado para o login.");
                  router.replace("/login");
                } catch (err) {
                  alert("Erro ao excluir conta: " + (err as Error).message);
                }
              }}
            >
              Excluir conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
