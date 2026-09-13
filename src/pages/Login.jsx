import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setErro('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      setErro('E-mail ou senha inválidos.');
      return;
    }

    navigate('/dashboard');
  }

  return (
    <div style={styles.container}>
      <form onSubmit={handleLogin} style={styles.card}>
        <h2>Login</h2>
        
        <div style={styles.field}>
          <label>E-mail</label>
          <input 
            type="email" 
            placeholder="Seu e-mail" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label>Senha</label>
          <input 
            type="password" 
            placeholder="Sua senha" 
            value={senha} 
            onChange={(e) => setSenha(e.target.value)} 
            required 
            style={styles.input}
          />
        </div>

        {erro && <p style={styles.erro}>{erro}</p>}

        <button type="submit" style={styles.button}>Entrar</button>

        <div style={styles.links}>
          <a href="/esqueci-senha" style={styles.link}>Esqueci minha senha</a>
          <a href="/cadastro" style={styles.link}>Criar uma conta</a>
        </div>
      </form>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '80vh',
    width: '100%',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    width: '100%',
    maxWidth: '380px',
    padding: '32px',
    borderRadius: '8px',
    backgroundColor: '#1a1a1a',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    color: '#fff',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
    gap: '6px',
  },
  input: {
    padding: '10px 12px',
    borderRadius: '4px',
    border: '1px solid #444',
    backgroundColor: '#2a2a2a',
    color: '#fff',
    fontSize: '14px',
  },
  button: {
    padding: '12px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#646cff',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '8px',
  },
  erro: {
    color: '#ff4d4d',
    fontSize: '14px',
    margin: 0,
  },
  links: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    marginTop: '8px',
  },
  link: {
    color: '#646cff',
    textDecoration: 'none',
  },
};