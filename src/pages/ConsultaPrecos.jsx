import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import MenuLateral from '../components/MenuLateral';
import igoLogo from '../assets/logo-igo-10.png';
import bgEstacionamento from '../assets/estacionamento-bg.jpeg';

const NAVY = '#00167a';
const NAVY_DARK = '#000d47';
const ORANGE = '#f96000';

// Cada pátio sempre trabalha com estes dois tipos, fixos.
const TIPOS = ['carro', 'moto'];
function tipoLabel(tv) { return tv === 'moto' ? 'Moto' : 'Carro'; }
function brl(v) { return 'R$ ' + Number(v ?? 0).toFixed(2).replace('.', ','); }

export default function ConsultaPrecos() {
  const [patios, setPatios] = useState([]);
  const [linhas, setLinhas] = useState({}); // chave `${patioId}|${tipo}` -> { id, valor_hora, valor_fracao, tolerancia }
  const [souAdmin, setSouAdmin] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [msg, setMsg] = useState('');
  const [msgTipo, setMsgTipo] = useState('ok');
  const [edit, setEdit] = useState({}); // { chave: true }

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setCarregando(true);
    const { data: auth } = await supabase.auth.getUser();
    let admin = false;
    if (auth?.user) {
      const { data: eu } = await supabase.from('usuario').select('perfil').eq('auth_user_id', auth.user.id).maybeSingle();
      admin = eu?.perfil === 'administrador';
    }
    setSouAdmin(admin);

    const { data: ps } = await supabase.from('patio').select('id, nome').order('nome');
    const { data: tp } = await supabase.from('tabela_preco')
      .select('id, patio_id, tipo_veiculo, valor_hora, valor_fracao, tolerancia_minutos');

    const mapa = {};
    (ps ?? []).forEach((p) => {
      TIPOS.forEach((tipo) => {
        const ex = (tp ?? []).find((x) => x.patio_id === p.id && x.tipo_veiculo === tipo);
        mapa[`${p.id}|${tipo}`] = ex
          ? { id: ex.id, valor_hora: ex.valor_hora, valor_fracao: ex.valor_fracao, tolerancia: ex.tolerancia_minutos }
          : { id: null, valor_hora: '', valor_fracao: '', tolerancia: '' };
      });
    });
    setPatios(ps ?? []);
    setLinhas(mapa);
    setCarregando(false);
  }

  function aviso(texto, tipo = 'ok') { setMsg(texto); setMsgTipo(tipo); }
  function setCampo(chave, campo, valor) { setLinhas((m) => ({ ...m, [chave]: { ...m[chave], [campo]: valor } })); }

  async function salvar(patioId, tipo) {
    const chave = `${patioId}|${tipo}`;
    const l = linhas[chave];
    if (l.valor_hora === '' || l.valor_fracao === '' || l.tolerancia === '') {
      aviso('Preencha valor/hora, fração e tolerância.', 'erro'); return;
    }
    const dados = {
      valor_hora: Number(l.valor_hora), valor_fracao: Number(l.valor_fracao),
      tolerancia_minutos: Number(l.tolerancia),
    };
    let error;
    if (l.id) {
      ({ error } = await supabase.from('tabela_preco').update(dados).eq('id', l.id));
    } else {
      ({ error } = await supabase.from('tabela_preco').insert({
        uuid: crypto.randomUUID(), patio_id: patioId, tipo_veiculo: tipo, ...dados,
      }));
    }
    if (error) { aviso('Erro ao salvar: ' + error.message, 'erro'); return; }
    setEdit((m) => ({ ...m, [chave]: false }));
    aviso('Preço salvo.'); carregar();
  }

  function cancelar() { setEdit({}); carregar(); }

  return (
    <div style={s.page}>
      <div style={s.bgOverlay} />

      <header style={s.nav}>
        <div style={s.navInner}>
          <img src={igoLogo} alt="iGO" style={s.navLogo} />
          <MenuLateral atual="precos" />
        </div>
      </header>

      <main style={s.content}>
        <div>
          <h1 style={s.title}>{souAdmin ? 'Gestão de Preços' : 'Consulta de Preços'}</h1>
          <p style={s.subtitle}>
            {souAdmin ? 'Edite os preços de carro e moto de cada pátio.'
                      : 'Tabela de preços vigente, por pátio e tipo de veículo. Somente leitura.'}
            {carregando ? ' — carregando...' : ''}
          </p>
        </div>

        {msg && <div style={{ ...s.aviso, ...(msgTipo === 'erro' ? s.avisoErro : s.avisoOk) }}>{msg}</div>}

        {patios.map((p) => (
          <div key={p.id} style={s.cardWrapper}>
            <span style={s.bracketTopRight} />
            <div style={s.card}>
              <h2 style={s.sectionTitle}>{p.nome}</h2>
              <div style={s.tableResponsive}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Tipo</th>
                      <th style={s.th}>Valor por hora</th>
                      <th style={s.th}>Valor da fração</th>
                      <th style={s.th}>Tolerância (min)</th>
                      {souAdmin && <th style={s.th}>Ações</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {TIPOS.map((tipo) => {
                      const chave = `${p.id}|${tipo}`;
                      const l = linhas[chave] || { id: null, valor_hora: '', valor_fracao: '', tolerancia: '' };
                      const editando = !!edit[chave];
                      const semPreco = l.id == null && l.valor_hora === '';
                      return (
                        <tr key={tipo} style={s.tr}>
                          <td style={s.tdBold}>{tipoLabel(tipo)}</td>
                          {souAdmin && editando ? (
                            <>
                              <td style={s.td}><input style={{ ...s.input, width: 100 }} type="number" step="0.01" min="0" value={l.valor_hora} onChange={(e) => setCampo(chave, 'valor_hora', e.target.value)} /></td>
                              <td style={s.td}><input style={{ ...s.input, width: 100 }} type="number" step="0.01" min="0" value={l.valor_fracao} onChange={(e) => setCampo(chave, 'valor_fracao', e.target.value)} /></td>
                              <td style={s.td}><input style={{ ...s.input, width: 90 }} type="number" min="0" value={l.tolerancia} onChange={(e) => setCampo(chave, 'tolerancia', e.target.value)} /></td>
                              <td style={s.td}>
                                <button style={s.btnMini} onClick={() => salvar(p.id, tipo)}>Salvar</button>
                                <button style={s.btnMiniGhost} onClick={cancelar}>Cancelar</button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td style={s.td}>{semPreco ? '—' : brl(l.valor_hora)}</td>
                              <td style={s.td}>{semPreco ? '—' : brl(l.valor_fracao)}</td>
                              <td style={s.td}>{semPreco ? '—' : `${l.tolerancia} min`}</td>
                              {souAdmin && (
                                <td style={s.td}>
                                  <button style={s.btnMiniGhost} onClick={() => setEdit((m) => ({ ...m, [chave]: true }))}>
                                    {semPreco ? 'Definir' : 'Editar'}
                                  </button>
                                </td>
                              )}
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
        {!carregando && patios.length === 0 && <p style={s.hint}>Nenhum pátio cadastrado.</p>}
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
  avisoOk: { background: 'rgba(163,230,53,0.12)', border: '1px solid rgba(163,230,53,0.4)', color: '#a3e635' },
  avisoErro: { background: 'rgba(255,80,80,0.12)', border: '1px solid rgba(255,80,80,0.4)', color: '#ffb4a2' },
  cardWrapper: { position: 'relative', width: '100%' },
  card: { padding: 24, borderRadius: 4, background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.18)', boxShadow: '0 10px 25px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: 14 },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 },
  tableResponsive: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '10px 12px', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', borderBottom: '1px solid rgba(255,255,255,0.15)', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.08)' },
  td: { padding: '10px 12px', fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  tdBold: { padding: '10px 12px', fontSize: 13, fontWeight: 700, color: '#fff' },
  input: { padding: '8px 10px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 13, outline: 'none', colorScheme: 'dark' },
  btnMini: { padding: '5px 10px', borderRadius: 4, border: 'none', backgroundColor: ORANGE, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', marginRight: 6 },
  btnMiniGhost: { padding: '5px 10px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  hint: { fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 },
  bracketTopRight: { position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderTop: `3px solid ${ORANGE}`, borderRight: `3px solid ${ORANGE}`, pointerEvents: 'none', zIndex: 2 },
};
