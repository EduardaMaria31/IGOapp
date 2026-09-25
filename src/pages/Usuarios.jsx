import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import MenuLateral from '../components/MenuLateral';
import igoLogo from '../assets/logo-igo-10.png';
import bgEstacionamento from '../assets/estacionamento-bg.jpeg';

const NAVY = '#00167a';
const NAVY_DARK = '#000d47';
const ORANGE = '#f96000';
const LIME = '#a3e635';

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [meuAuthId, setMeuAuthId] = useState(null);
  const [souAdmin, setSouAdmin] = useState(null); // null = ainda verificando
  const [carregando, setCarregando] = useState(true);
  const [msg, setMsg] = useState('');
  const [msgTipo, setMsgTipo] = useState('ok');

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setCarregando(true);
    const { data: auth } = await supabase.auth.getUser();
    const authId = auth?.user?.id ?? null;
    setMeuAuthId(authId);

    // Verifica se o usuário logado é administrador
    let admin = false;
    if (authId) {
      const { data: eu } = await supabase
        .from('usuario').select('perfil').eq('auth_user_id', authId).maybeSingle();
      admin = eu?.perfil === 'administrador';
    }
    setSouAdmin(admin);

    if (admin) {
      const { data } = await supabase
        .from('usuario')
        .select('id, nome, email, perfil, status, auth_user_id, criado_em')
        .order('nome');
      setUsuarios(data ?? []);
    }
    setCarregando(false);
  }

  function aviso(texto, tipo = 'ok') { setMsg(texto); setMsgTipo(tipo); }

  async function alterar(id, campo, valor) {
    // Atualização otimista + persistência
    const antes = usuarios;
    setUsuarios((us) => us.map((u) => (u.id === id ? { ...u, [campo]: valor } : u)));
    const { error } = await supabase.from('usuario').update({ [campo]: valor }).eq('id', id);
    if (error) {
      setUsuarios(antes); // reverte
      aviso('Não foi possível salvar: ' + error.message, 'erro');
    } else {
      aviso('Alteração salva.', 'ok');
    }
  }

  return (
    <div style={s.page}>
      <div style={s.bgOverlay} />

      <header style={s.nav}>
        <div style={s.navInner}>
          <img src={igoLogo} alt="iGO" style={s.navLogo} />
          <MenuLateral atual="usuarios" />
        </div>
      </header>

      <main style={s.content}>
        <div>
          <h1 style={s.title}>Gerenciar Usuários</h1>
          <p style={s.subtitle}>Altere o perfil (operador ou administrador) e o status de cada login.</p>
        </div>

        {msg && (
          <div style={{ ...s.aviso, ...(msgTipo === 'erro' ? s.avisoErro : s.avisoOk) }}>{msg}</div>
        )}

        {souAdmin === false && !carregando && (
          <div style={s.cardWrapper}>
            <span style={s.bracketTopRight} />
            <div style={s.card}>
              <h2 style={s.sectionTitle}>Acesso restrito</h2>
              <p style={s.hint}>Esta área é exclusiva para administradores.</p>
            </div>
          </div>
        )}

        {souAdmin && (
          <div style={s.cardWrapper}>
            <span style={s.bracketBottomLeft} />
            <div style={s.card}>
              <h2 style={s.sectionTitle}>Logins cadastrados</h2>
              <div style={s.tableResponsive}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Nome</th>
                      <th style={s.th}>E-mail</th>
                      <th style={s.th}>Perfil</th>
                      <th style={s.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((u) => {
                      const ehVoce = u.auth_user_id && u.auth_user_id === meuAuthId;
                      return (
                        <tr key={u.id} style={s.tr}>
                          <td style={s.tdBold}>
                            {u.nome} {ehVoce && <span style={s.voceTag}>Você</span>}
                          </td>
                          <td style={s.td}>{u.email}</td>
                          <td style={s.td}>
                            <select
                              style={s.select}
                              value={u.perfil}
                              disabled={ehVoce}
                              title={ehVoce ? 'Você não pode alterar o próprio perfil' : 'Alterar perfil'}
                              onChange={(e) => alterar(u.id, 'perfil', e.target.value)}>
                              <option value="operador">Operador</option>
                              <option value="administrador">Administrador</option>
                            </select>
                          </td>
                          <td style={s.td}>
                            <select
                              style={s.select}
                              value={u.status}
                              disabled={ehVoce}
                              title={ehVoce ? 'Você não pode desativar a si mesmo' : 'Alterar status'}
                              onChange={(e) => alterar(u.id, 'status', e.target.value)}>
                              <option value="ativo">Ativo</option>
                              <option value="inativo">Inativo</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                    {usuarios.length === 0 && (
                      <tr><td style={s.td} colSpan={4}>Nenhum usuário encontrado.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p style={s.hint}>Promover alguém a administrador dá acesso a todas as telas de gestão. Você não pode alterar o próprio perfil, para evitar ficar sem acesso.</p>
            </div>
          </div>
        )}
      </main>

      <style>{`*,*::before,*::after{box-sizing:border-box}html,body,#root{margin:0;width:100vw;min-height:100vh}`}</style>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', width: '100vw', position: 'relative', overflowX: 'hidden', backgroundImage: `url(${bgEstacionamento})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', system-ui, sans-serif" },
  bgOverlay: { position: 'fixed', inset: 0, background: `linear-gradient(100deg, rgba(0,13,71,0.65) 0%, rgba(0,22,122,0.85) 45%, ${NAVY} 85%, ${NAVY_DARK} 100%)`, zIndex: 0 },
  nav: { position: 'relative', zIndex: 2, padding: '20px 48px', borderBottom: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,13,71,0.4)', backdropFilter: 'blur(10px)' },
  navInner: { width: '100%', maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  navLogo: { height: 60, objectFit: 'contain', mixBlendMode: 'screen' },
  content: { position: 'relative', zIndex: 1, maxWidth: 1200, width: '90%', margin: '0 auto', padding: '32px 0 60px', display: 'flex', flexDirection: 'column', gap: 20 },
  title: { fontSize: 32, fontWeight: 800, margin: '0 0 6px', color: '#fff' },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.75)', margin: 0 },
  aviso: { padding: '12px 16px', borderRadius: 4, fontSize: 14, fontWeight: 600, backdropFilter: 'blur(14px)' },
  avisoOk: { background: 'rgba(163,230,53,0.12)', border: '1px solid rgba(163,230,53,0.4)', color: LIME },
  avisoErro: { background: 'rgba(255,80,80,0.12)', border: '1px solid rgba(255,80,80,0.4)', color: '#ffb4a2' },
  cardWrapper: { position: 'relative', width: '100%' },
  card: { padding: 24, borderRadius: 4, background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.18)', boxShadow: '0 10px 25px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: 14 },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 },
  tableResponsive: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '10px 12px', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', borderBottom: '1px solid rgba(255,255,255,0.15)', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.08)' },
  td: { padding: '12px', fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  tdBold: { padding: '12px', fontSize: 13, fontWeight: 700, color: '#fff' },
  select: { padding: '6px 10px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 13, outline: 'none', colorScheme: 'dark', cursor: 'pointer' },
  voceTag: { marginLeft: 8, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 800, background: 'rgba(249,96,0,0.2)', border: '1px solid rgba(249,96,0,0.5)', color: ORANGE },
  hint: { fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 },
  bracketTopRight: { position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderTop: `3px solid ${ORANGE}`, borderRight: `3px solid ${ORANGE}`, pointerEvents: 'none', zIndex: 2 },
  bracketBottomLeft: { position: 'absolute', bottom: -8, left: -8, width: 24, height: 24, borderBottom: `3px solid ${ORANGE}`, borderLeft: `3px solid ${ORANGE}`, pointerEvents: 'none', zIndex: 2 },
};
