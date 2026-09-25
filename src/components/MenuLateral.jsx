import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const ORANGE = '#f96000';

// Ícones simples em SVG (sem emojis, no estilo do site)
function Icone({ nome }) {
  const p = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (nome === 'painel') return (<svg {...p}><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></svg>);
  if (nome === 'operacao') return (<svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 15l2 2 4-4" /></svg>);
  if (nome === 'vagas') return (<svg {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 17V7h4a3 3 0 0 1 0 6H9" /></svg>);
  if (nome === 'precos') return (<svg {...p}><path d="M20 12V8H6a2 2 0 0 1 0-4h12v4" /><path d="M4 6v12a2 2 0 0 0 2 2h14v-4" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg>);
  if (nome === 'usuarios') return (<svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>);
  if (nome === 'sair') return (<svg {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>);
  if (nome === 'menu') return (<svg {...p}><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>);
  return null;
}

// Menu lateral compartilhado por todas as telas.
// - As opções de operação aparecem para todos os perfis.
// - As opções de administração só aparecem para quem é administrador.
export default function MenuLateral({ atual }) {
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [perfil, setPerfil] = useState('operador');

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;
      const { data } = await supabase
        .from('usuario')
        .select('nome, perfil')
        .eq('auth_user_id', auth.user.id)
        .maybeSingle();
      if (data) { setNome(data.nome || ''); setPerfil(data.perfil || 'operador'); }
    })();
  }, []);

  const ehAdmin = perfil === 'administrador';

  const itensOperacao = [
    { key: 'painel', rota: '/dashboard', label: 'Painel', icone: 'painel' },
    { key: 'operacao', rota: '/operacao', label: 'Operação', icone: 'operacao' },
    { key: 'vagas', rota: '/consulta-vagas', label: 'Consulta de vagas', icone: 'vagas' },
    { key: 'precos', rota: '/consulta-precos', label: 'Consulta de preços', icone: 'precos' },
  ];
  const itensAdmin = [
    { key: 'usuarios', rota: '/usuarios', label: 'Gerenciar usuários', icone: 'usuarios' },
  ];

  function ir(rota) { setAberto(false); navigate(rota); }
  async function sair() { await supabase.auth.signOut(); navigate('/login'); }

  function LinkItem({ item }) {
    const ativo = item.key === atual;
    return (
      <button
        onClick={() => ir(item.rota)}
        style={{ ...st.item, ...(ativo ? st.itemAtivo : {}) }}>
        <span style={st.itemIcone}><Icone nome={item.icone} /></span>
        {item.label}
      </button>
    );
  }

  return (
    <>
      <button onClick={() => setAberto(true)} style={st.botaoMenu} title="Abrir menu">
        <Icone nome="menu" />
        <span style={st.botaoMenuTxt}>Menu</span>
        <span style={st.perfilBadge}>{ehAdmin ? 'ADMIN' : 'OPERADOR'}</span>
      </button>

      {aberto && (
        <div style={st.overlay} onClick={() => setAberto(false)}>
          <aside style={st.drawer} onClick={(e) => e.stopPropagation()}>
            <div style={st.drawerHeader}>
              <div>
                <div style={st.drawerNome}>{nome || 'Usuário'}</div>
                <div style={st.drawerPerfil}>Perfil: {ehAdmin ? 'ADMINISTRADOR' : 'OPERADOR'}</div>
              </div>
              <button style={st.fechar} onClick={() => setAberto(false)}>✕</button>
            </div>

            <nav style={st.grupo}>
              <span style={st.grupoTitulo}>Operação</span>
              {itensOperacao.map((it) => <LinkItem key={it.key} item={it} />)}
            </nav>

            {ehAdmin && (
              <nav style={st.grupo}>
                <span style={st.grupoTitulo}>Administração</span>
                {itensAdmin.map((it) => <LinkItem key={it.key} item={it} />)}
              </nav>
            )}

            <div style={st.rodape}>
              <button onClick={sair} style={st.itemSair}>
                <span style={st.itemIcone}><Icone nome="sair" /></span>
                Sair
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

const st = {
  botaoMenu: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  botaoMenuTxt: { letterSpacing: 0.3 },
  perfilBadge: { marginLeft: 4, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 800, letterSpacing: 0.5, background: 'rgba(249,96,0,0.2)', border: '1px solid rgba(249,96,0,0.5)', color: ORANGE },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(5, 23, 69, 0.5)', backdropFilter: 'blur(3px)', zIndex: 60, display: 'flex', justifyContent: 'flex-end', animation: 'fadeIn 0.2s ease' },
  drawer: { width: 300, maxWidth: '85vw', height: '100%', background: '#071a5c', borderLeft: '1px solid rgba(253, 237, 237, 0.15)', boxShadow: '-20px 0 50px rgba(0,0,0,0.5)', padding: 20, display: 'flex', flexDirection: 'column', gap: 18, animation: 'slideIn 0.25s ease' },
  drawerHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.12)' },
  drawerNome: { fontSize: 16, fontWeight: 800, color: '#fff' },
  drawerPerfil: { fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginTop: 2 },
  fechar: { background: 'transparent', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' },
  grupo: { display: 'flex', flexDirection: 'column', gap: 4 },
  grupoTitulo: { fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 0.6, margin: '0 0 6px 4px' },
  item: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 6, border: '1px solid transparent', background: 'transparent', color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'left' },
  itemAtivo: { background: 'rgba(249,96,0,0.15)', border: '1px solid rgba(249,96,0,0.4)', color: '#fff' },
  itemIcone: { display: 'inline-flex', color: ORANGE },
  rodape: { marginTop: 'auto', paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.12)' },
  itemSair: { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
};
