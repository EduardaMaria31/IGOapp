import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import igoLogo from '../assets/logo-igo-10.png';
import bgEstacionamento from '../assets/estacionamento-bg.jpeg';

const NAVY = '#00167a';
const NAVY_DARK = '#000d47';
const ORANGE = '#f96000';
const LIME = '#a3e635';

// Mostra o tipo do veículo com um ícone
function tipoLabel(tv) {
  if (tv === 'moto') return 'Moto';
  if (tv === 'carro') return 'Carro';
  return tv || '—';
}
// Ícone "ver detalhes" (olho) em SVG
function IconeOlho() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
// Linha de informação usada no cartão de detalhes
function Info({ label, valor }) {
  return (
    <div style={s.infoRow}>
      <span style={s.infoLabel}>{label}</span>
      <span style={s.infoValue}>{valor ?? '—'}</span>
    </div>
  );
}

export default function Operacao() {
  const navigate = useNavigate();

  const [vagas, setVagas] = useState([]);
  const [ativas, setAtivas] = useState([]);
  const [placa, setPlaca] = useState('');
  const [modelo, setModelo] = useState('');
  const [tipo, setTipo] = useState('carro'); // carro ou moto
  const [donoNome, setDonoNome] = useState('');
  const [donoTel, setDonoTel] = useState('');
  const [vagaId, setVagaId] = useState('');
  const [msg, setMsg] = useState('');
  const [msgTipo, setMsgTipo] = useState('ok'); // 'ok' ou 'erro'
  const [detalhe, setDetalhe] = useState(null); // veículo aberto no cartão de detalhes

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    const { data: vs } = await supabase
      .from('vaga')
      .select('id, numero, status')
      .order('numero');
    setVagas(vs ?? []);

    const { data: at } = await supabase
      .from('transacao')
      .select('id, hora_entrada, veiculo:veiculo_id ( placa, modelo, tipo_veiculo, proprietario_nome, proprietario_telefone ), vaga:vaga_id ( numero )')
      .is('hora_saida', null)
      .order('hora_entrada', { ascending: false });
    setAtivas(at ?? []);
  }

  function aviso(texto, tipo = 'ok') {
    setMsg(texto);
    setMsgTipo(tipo);
  }

  // Retorna a linha em 'usuario' do usuário logado (para usar como operador)
  async function operadorAtual() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return null;
    const { data } = await supabase
      .from('usuario')
      .select('id')
      .eq('auth_user_id', auth.user.id)
      .single();
    return data;
  }

  async function registrarEntrada(e) {
    e.preventDefault();
    setMsg('');
    try {
      const p = placa.trim().toUpperCase();
      if (!p || !vagaId) { aviso('Preencha a placa e escolha uma vaga.', 'erro'); return; }

      // 1) acha o veículo pela placa; se não existir, cria
      let { data: veic } = await supabase.from('veiculo').select('id').eq('placa', p).maybeSingle();
      if (!veic) {
        const { data: novo, error } = await supabase
          .from('veiculo')
          .insert({ uuid: crypto.randomUUID(), placa: p, modelo: modelo.trim(), tipo_veiculo: tipo, proprietario_nome: donoNome.trim() || null, proprietario_telefone: donoTel.trim() || null })
          .select('id').single();
        if (error) throw error;
        veic = novo;
      }

      // 2) operador (usuário logado)
      const op = await operadorAtual();
      if (!op) { aviso('Não encontrei seu usuário. Recarregue e tente de novo.', 'erro'); return; }

      // 3) função do banco: cria a transação e ocupa a vaga (atômico)
      const { error } = await supabase.rpc('registrar_entrada', {
        p_veiculo_id: veic.id,
        p_vaga_id: Number(vagaId),
        p_operador_id: op.id,
      });
      if (error) throw error;

      setPlaca(''); setModelo(''); setDonoNome(''); setDonoTel(''); setVagaId('');
      aviso(`Entrada registrada para a placa ${p}!`, 'ok');
      carregar();
    } catch (err) {
      aviso('Erro: ' + err.message, 'erro');
    }
  }

  async function registrarSaida(transacaoId) {
    setMsg('');
    const { data, error } = await supabase.rpc('registrar_saida', { p_transacao_id: transacaoId });
    if (error) { aviso('Erro: ' + error.message, 'erro'); return; }
    const valor = Number(data?.valor_calculado ?? 0);
    aviso(`Saída registrada. Valor cobrado: R$ ${valor.toFixed(2)}`, 'ok');
    carregar();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  const livres = vagas.filter((v) => v.status === 'livre');

  function horaBR(ts) {
    if (!ts) return '—';
    // O banco guarda o horário em UTC (timestamp sem fuso). Lemos como UTC e
    // exibimos no fuso de Brasília.
    let iso = String(ts).trim().replace(' ', 'T');
    if (!/[zZ]|[+-]\d\d:?\d\d$/.test(iso)) iso += 'Z';
    return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  }

  return (
    <div style={s.page}>
      <div style={s.bgOverlay} />

      <header style={s.nav}>
        <div style={s.navInner}>
          <img src={igoLogo} alt="iGO" style={s.navLogo} />
          <div style={s.navRight}>
            <button onClick={() => navigate('/dashboard')} style={s.ghostBtn}>← Painel</button>
            <button onClick={handleLogout} style={s.logoutBtn}>Sair</button>
          </div>
        </div>
      </header>

      <main style={s.content}>
        <div>
          <h1 style={s.title}>Operação do Pátio</h1>
          <p style={s.subtitle}>Registre a entrada e a saída dos veículos.</p>
        </div>

        {msg && (
          <div style={{ ...s.aviso, ...(msgTipo === 'erro' ? s.avisoErro : s.avisoOk) }}>{msg}</div>
        )}

        {/* Registrar entrada */}
        <div style={s.cardWrapper}>
          <span style={s.bracketTopRight} />
          <div style={s.card}>
            <h2 style={s.sectionTitle}>Registrar entrada</h2>
            <form onSubmit={registrarEntrada} style={s.formRow}>
              <label style={s.field}>
                <span style={s.fieldLabel}>Placa *</span>
                <input style={s.input} placeholder="Ex.: ABC1D23" value={placa} required
                  onChange={(e) => setPlaca(e.target.value)} />
              </label>
              <label style={s.field}>
                <span style={s.fieldLabel}>Modelo *</span>
                <input style={s.input} placeholder="Ex.: Fiat Uno" value={modelo} required
                  onChange={(e) => setModelo(e.target.value)} />
              </label>
              <label style={s.field}>
                <span style={s.fieldLabel}>Tipo</span>
                <select style={s.input} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  <option value="carro">Carro</option>
                  <option value="moto">Moto</option>
                </select>
              </label>
              <label style={s.field}>
                <span style={s.fieldLabel}>Proprietário (opcional)</span>
                <input style={s.input} placeholder="Ex.: João Silva" value={donoNome}
                  onChange={(e) => setDonoNome(e.target.value)} />
              </label>
              <label style={s.field}>
                <span style={s.fieldLabel}>Telefone (opcional)</span>
                <input style={s.input} placeholder="Ex.: (81) 99999-0000" value={donoTel}
                  onChange={(e) => setDonoTel(e.target.value)} />
              </label>
              <label style={s.field}>
                <span style={s.fieldLabel}>Vaga</span>
                <select style={s.input} value={vagaId} onChange={(e) => setVagaId(e.target.value)}>
                  <option value="">Escolha uma vaga livre</option>
                  {livres.map((v) => <option key={v.id} value={v.id}>Vaga {v.numero}</option>)}
                </select>
              </label>
              <button type="submit" style={s.button}>Registrar entrada</button>
            </form>
            {livres.length === 0 && <p style={s.hint}>Nenhuma vaga livre no momento.</p>}
          </div>
        </div>

        {/* Carros no pátio agora */}
        <div style={s.cardWrapper}>
          <span style={s.bracketBottomLeft} />
          <div style={s.card}>
            <h2 style={s.sectionTitle}>Carros no pátio agora</h2>
            <div style={s.tableResponsive}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Placa</th>
                    <th style={s.th}>Modelo</th>
                    <th style={s.th}>Tipo</th>
                    <th style={s.th}>Vaga</th>
                    <th style={s.th}>Entrada</th>
                    <th style={s.th}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {ativas.map((t) => (
                    <tr key={t.id} style={s.tr}>
                      <td style={s.tdBold}>{t.veiculo?.placa ?? '—'}</td>
                      <td style={s.td}>{t.veiculo?.modelo ?? '—'}</td>
                      <td style={s.td}>{tipoLabel(t.veiculo?.tipo_veiculo)}</td>
                      <td style={s.td}>{t.vaga?.numero ?? '—'}</td>
                      <td style={s.td}>{horaBR(t.hora_entrada)}</td>
                      <td style={s.td}>
                        <button style={s.olhoBtn} title="Ver detalhes" onClick={() => setDetalhe(t)}><IconeOlho /></button>
                        <button style={s.saidaBtn} onClick={() => registrarSaida(t.id)}>Registrar saída</button>
                      </td>
                    </tr>
                  ))}
                  {ativas.length === 0 && (
                    <tr><td style={s.td} colSpan={6}>Nenhum carro no pátio agora.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Mapa de vagas */}
        <div style={s.cardWrapper}>
          <span style={s.bracketTopRight} />
          <div style={s.card}>
            <h2 style={s.sectionTitle}>Vagas</h2>
            <div style={s.vagasWrap}>
              {vagas.map((v) => (
                <span key={v.id} style={{
                  ...s.vagaTag,
                  background: v.status === 'livre' ? 'rgba(163,230,53,0.15)' : 'rgba(249,96,0,0.15)',
                  color: v.status === 'livre' ? LIME : ORANGE,
                  borderColor: v.status === 'livre' ? 'rgba(163,230,53,0.4)' : 'rgba(249,96,0,0.4)',
                }}>
                  {v.numero} · {v.status}
                </span>
              ))}
              {vagas.length === 0 && <p style={s.hint}>Nenhuma vaga cadastrada.</p>}
            </div>
          </div>
        </div>
      </main>

      {detalhe && (
        <div style={s.modalOverlay} onClick={() => setDetalhe(null)}>
          <div style={s.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Detalhes do veículo</h3>
              <button style={s.modalClose} onClick={() => setDetalhe(null)}>✕</button>
            </div>
            <Info label="Placa" valor={detalhe.veiculo?.placa} />
            <Info label="Modelo" valor={detalhe.veiculo?.modelo} />
            <Info label="Tipo" valor={tipoLabel(detalhe.veiculo?.tipo_veiculo)} />
            <Info label="Proprietário" valor={detalhe.veiculo?.proprietario_nome || 'Não informado'} />
            <Info label="Telefone" valor={detalhe.veiculo?.proprietario_telefone || 'Não informado'} />
            <Info label="Vaga" valor={detalhe.vaga?.numero} />
            <Info label="Entrada" valor={horaBR(detalhe.hora_entrada)} />
          </div>
        </div>
      )}

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
  navRight: { display: 'flex', alignItems: 'center', gap: 12 },
  ghostBtn: { padding: '8px 16px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  logoutBtn: { padding: '8px 16px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  content: { position: 'relative', zIndex: 1, maxWidth: 1200, width: '90%', margin: '0 auto', padding: '32px 0 60px', display: 'flex', flexDirection: 'column', gap: 20 },
  title: { fontSize: 32, fontWeight: 800, margin: '0 0 6px', color: '#fff' },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.75)', margin: 0 },
  aviso: { padding: '12px 16px', borderRadius: 4, fontSize: 14, fontWeight: 600, backdropFilter: 'blur(14px)' },
  avisoOk: { background: 'rgba(163,230,53,0.12)', border: '1px solid rgba(163,230,53,0.4)', color: LIME },
  avisoErro: { background: 'rgba(255,80,80,0.12)', border: '1px solid rgba(255,80,80,0.4)', color: '#ffb4a2' },
  cardWrapper: { position: 'relative', width: '100%' },
  card: { padding: 24, borderRadius: 4, background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.18)', boxShadow: '0 10px 25px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: 14 },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 },
  formRow: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  fieldLabel: { fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' },
  input: { padding: '10px 12px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 14, outline: 'none', colorScheme: 'dark' },
  button: { padding: '10px 18px', borderRadius: 4, border: 'none', backgroundColor: ORANGE, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  saidaBtn: { padding: '6px 12px', borderRadius: 4, border: 'none', backgroundColor: ORANGE, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  olhoBtn: { background: 'transparent', border: 'none', cursor: 'pointer', marginRight: 8, padding: 4, color: 'rgba(255,255,255,0.85)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', verticalAlign: 'middle' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, animation: 'fadeIn 0.2s ease' },
  modalCard: { width: '100%', maxWidth: 420, background: '#0a1f6b', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.5)', animation: 'popIn 0.2s ease' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' },
  modalClose: { background: 'transparent', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' },
  infoRow: { display: 'flex', justifyContent: 'space-between', gap: 16, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' },
  infoLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 600 },
  infoValue: { fontSize: 14, color: '#fff', textAlign: 'right' },
  hint: { fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 },
  tableResponsive: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '10px 12px', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', borderBottom: '1px solid rgba(255,255,255,0.15)', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.08)' },
  td: { padding: '12px', fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  tdBold: { padding: '12px', fontSize: 13, fontWeight: 700, color: '#fff' },
  vagasWrap: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  vagaTag: { padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: '1px solid' },
  bracketTopRight: { position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderTop: `3px solid ${ORANGE}`, borderRight: `3px solid ${ORANGE}`, pointerEvents: 'none', zIndex: 2 },
  bracketBottomLeft: { position: 'absolute', bottom: -8, left: -8, width: 24, height: 24, borderBottom: `3px solid ${ORANGE}`, borderLeft: `3px solid ${ORANGE}`, pointerEvents: 'none', zIndex: 2 },
};
