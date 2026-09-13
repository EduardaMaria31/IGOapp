import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function RotaPrivada({ children }) {
  const [sessao, setSessao] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessao(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (sessao === undefined) return <p>Carregando...</p>;
  return sessao ? children : <Navigate to="/login" />;
}