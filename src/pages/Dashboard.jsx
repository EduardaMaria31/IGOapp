import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function Dashboard() {
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  return (
    <div>
      <h1>Painel Principal (Dashboard)</h1>
      <p>Bem-vindo ao sistema!</p>
      <button onClick={handleLogout}>Sair</button>
    </div>
  );
}