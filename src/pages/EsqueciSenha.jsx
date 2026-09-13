import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function EsqueciSenha() {
  const [email, setEmail] = useState('');
  const [mensagem, setMensagem] = useState('');

  async function handleReset(e) {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });

    setMensagem(
      error ? error.message : 'Se o e-mail existir, enviamos um link de recuperação.'
    );
  }

  return (
    <form onSubmit={handleReset}>
      <h2>Esqueci minha senha</h2>
      <input 
        type="email" 
        placeholder="Seu e-mail" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)} 
        required 
      />
      <button type="submit">Enviar link de recuperação</button>
      {mensagem && <p>{mensagem}</p>}
    </form>
  );
}