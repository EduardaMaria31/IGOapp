import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import EsqueciSenha from './pages/EsqueciSenha';
import Dashboard from './pages/Dashboard';
import RotaPrivada from './components/RotaPrivada';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Rotas Públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/esqueci-senha" element={<EsqueciSenha />} />

        {/* Rota Protegida */}
        <Route 
          path="/dashboard" 
          element={
            <RotaPrivada>
              <Dashboard />
            </RotaPrivada>
          } 
        />

        {/* Redirecionamento padrão para /login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

