import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Cadastro() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  async function handleCadastro(e) {
    e.preventDefault();
    setErro('');

    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome } },
    });

    if (error) {
      setErro(error.message);
      return;
    }

    setSucesso(true);
  }

  if (sucesso) {
    return <p>Cadastro realizado! Verifique seu e-mail para confirmar a conta.</p>;
  }

  return (
    <form onSubmit={handleCadastro}>
      <h2>Cadastro</h2>
      <input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
      <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={6} />
      {erro && <p style={{ color: 'red' }}>{erro}</p>}
      <button type="submit">Cadastrar</button>
    </form>
  );
}