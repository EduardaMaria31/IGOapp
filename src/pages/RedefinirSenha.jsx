import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function RedefinirSenha() {
  const [novaSenha, setNovaSenha] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const navigate = useNavigate();

  async function handleRedefinir(e) {
    e.preventDefault();
    setErro('');

    const { error } = await supabase.auth.updateUser({ password: novaSenha });

    if (error) {
      setErro(error.message);
      return;
    }

    setSucesso(true);
    setTimeout(() => navigate('/login'), 2000);
  }

  if (sucesso) {
    return <p>Senha alterada! Redirecionando para o login...</p>;
  }

  return (
    <form onSubmit={handleRedefinir}>
      <h2>Definir nova senha</h2>
      <input type="password" placeholder="Nova senha" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} required minLength={6} />
      {erro && <p style={{ color: 'red' }}>{erro}</p>}
      <button type="submit">Salvar nova senha</button>
    </form>
  );
}