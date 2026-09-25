import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import EsqueciSenha from './pages/EsqueciSenha';
import RedefinirSenha from './pages/RedefinirSenha';
import Dashboard from './pages/Dashboard';
import Operacao from './pages/Operacao';
import ConsultaVagas from './pages/ConsultaVagas';
import ConsultaPrecos from './pages/ConsultaPrecos';
import Usuarios from './pages/Usuarios';

// Protege rotas que exigem login (definida aqui mesmo, sem depender de outro arquivo).
function RotaPrivada({ children }) {
  const [sessao, setSessao] = useState(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s));
    return () => listener.subscription.unsubscribe();
  }, []);
  if (sessao === undefined) return null; // ainda verificando
  return sessao ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/esqueci-senha" element={<EsqueciSenha />} />
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />

        {/* Protegidas */}
        <Route path="/dashboard" element={<RotaPrivada><Dashboard /></RotaPrivada>} />
        <Route path="/operacao" element={<RotaPrivada><Operacao /></RotaPrivada>} />
        <Route path="/consulta-vagas" element={<RotaPrivada><ConsultaVagas /></RotaPrivada>} />
        <Route path="/consulta-precos" element={<RotaPrivada><ConsultaPrecos /></RotaPrivada>} />
        <Route path="/usuarios" element={<RotaPrivada><Usuarios /></RotaPrivada>} />

        {/* Qualquer outra rota vai para o login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
