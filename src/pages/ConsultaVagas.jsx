import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import MenuLateral from '../components/MenuLateral';
import igoLogo from '../assets/logo-igo-10.png';
import bgEstacionamento from '../assets/estacionamento-bg.jpeg';

const NAVY = '#00167a';
const NAVY_DARK = '#000d47';
const ORANGE = '#f96000';
const LIME = '#a3e635';

// ---- Nome do pátio: sempre "Pátio <Nome>" (sem duplicar o prefixo) ----
function capitalizar(txt) { txt = (txt || '').trim(); return txt ? txt[0].toUpperCase() + txt.slice(1) : txt; }
function nomeBase(nome) { return (nome || '').replace(/^p[áa]tio\s+/i, '').trim(); }
function normalizarNomePatio(nome) {
  const base = capitalizar(nomeBase(nome));
  return base ? ('Pátio ' + base) : '';
}

// ---- Prefixo único de cada pátio (inicial do nome), desambiguando iniciais iguais ----
// Ex.: "Praia" (criado antes) -> P ; "Porta" (depois, P já usado) -> PO
function calcularPrefixos(patios) {
  const ordenados = [...patios].sort((a, b) => a.id - b.id); // ordem de criação
  const usados = new Set();
  const mapa = {};
  for (const p of ordenados) {
    const base = nomeBase(p.nome).toUpperCase().replace(/[^A-Z0-9]/g, '');
    let len = 1;
    let pref = base.slice(0, len) || 'X';
    while (usados.has(pref) && len < base.length) { len++; pref = base.slice(0, len); }
    if (usados.has(pref)) { let k = 2; while (usados.has(pref + k)) k++; pref = pref + k; } // fallback raro
    usados.add(pref);
    mapa[p.id] = pref;
  }
  return mapa;
}

export default function ConsultaVagas() {
  const [patios, setPatios] = useState([]);
  const [vagas, setVagas] = useState([]);
  const [souAdmin, setSouAdmin] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [msg, setMsg] = useState('');
  const [msgTipo, setMsgTipo] = useState('ok');
  const [novoPatio, setNovoPatio] = useState({ nome: '', endereco: '', capacidade: '' });
  const [editPatio, setEditPatio] = useState({});
  const [editVaga, setEditVaga] = useState({});

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
    const { data: ps } = await supabase.from('patio').select('id, nome, endereco, capacidade_total').order('nome');
    const { data: vs } = await supabase.from('vaga').select('id, numero, status, patio_id').order('numero');
    setPatios(ps ?? []);
    setVagas(vs ?? []);
    setCarregando(false);
  }

  function aviso(texto, tipo = 'ok') { setMsg(texto); setMsgTipo(tipo); }
  function setPatioCampo(id, campo, valor) { setPatios((ps) => ps.map((p) => (p.id === id ? { ...p, [campo]: valor } : p))); }
  function setVagaCampo(id, campo, valor) { setVagas((vs) => vs.map((v) => (v.id === id ? { ...v, [campo]: valor } : v))); }

  const prefixos = calcularPrefixos(patios);
  function proximoNumeroVaga(patioId) {
    const pref = prefixos[patioId] || 'X';
    let maxN = 0;
    vagas.filter((v) => v.patio_id === patioId).forEach((v) => {
      const m = /(\d+)$/.exec(v.numero || '');
      if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
    });
    return pref + (maxN + 1);
  }

  // ---------- pátios ----------
  async function addPatio() {
    const nome = normalizarNomePatio(novoPatio.nome);
    if (!nome) { aviso('Informe o nome do pátio.', 'erro'); return; }
    const cap = novoPatio.capacidade === '' ? null : Number(novoPatio.capacidade);
    const { data: novo, error } = await supabase.from('patio').insert({
      uuid: crypto.randomUUID(), nome,
      endereco: novoPatio.endereco.trim() || null,
      capacidade_total: cap,
    }).select('id').single();
    if (error) { aviso('Erro ao criar pátio: ' + error.message, 'erro'); return; }
    let extra = '';
    if (cap && cap > 0 && novo?.id) {
      const r = await sincronizarVagas(novo.id, cap);
      if (r?.criadas) extra = ` ${r.criadas} vaga(s) criada(s) automaticamente.`;
    }
    setNovoPatio({ nome: '', endereco: '', capacidade: '' });
    aviso(`Pátio criado como "${nome}".${extra}`); carregar();
  }
  async function salvarPatio(p) {
    const nome = normalizarNomePatio(p.nome);
    if (!nome) { aviso('Informe o nome do pátio.', 'erro'); return; }
    const alvo = p.capacidade_total === '' || p.capacidade_total == null ? null : Number(p.capacidade_total);
    const { error } = await supabase.from('patio').update({ nome, endereco: p.endereco, capacidade_total: alvo }).eq('id', p.id);
    if (error) { aviso('Erro ao salvar pátio: ' + error.message, 'erro'); return; }
    let extra = '';
    let tipo = 'ok';
    if (alvo != null) {
      const r = await sincronizarVagas(p.id, alvo);
      if (r?.erro) { extra = ' (não foi possível ajustar as vagas: ' + r.erro + ')'; tipo = 'erro'; }
      else if (r?.criadas) extra = ` ${r.criadas} vaga(s) criada(s).`;
      else if (r?.removidas != null) {
        if (r.bloqueadas > 0) {
          // Não deu para reduzir até o alvo: devolve a capacidade ao número real de vagas
          await supabase.from('patio').update({ capacidade_total: r.finalCount }).eq('id', p.id);
          extra = ` Não foi possível reduzir para ${alvo}: ${r.bloqueadas} vaga(s) ocupada(s) ou com histórico não podem ser removidas.` +
                  `${r.removidas > 0 ? ' ' + r.removidas + ' vaga(s) livre(s) removida(s).' : ''} Capacidade mantida em ${r.finalCount}.`;
          tipo = 'erro';
        } else if (r.removidas > 0) {
          extra = ` ${r.removidas} vaga(s) removida(s).`;
        }
      }
    }
    setEditPatio((m) => ({ ...m, [p.id]: false }));
    aviso('Pátio salvo.' + extra, tipo); carregar();
  }
  async function excluirPatio(id) {
    const { error } = await supabase.from('patio').delete().eq('id', id);
    if (error) { aviso('Não foi possível excluir (verifique se ainda há vagas neste pátio): ' + error.message, 'erro'); return; }
    aviso('Pátio excluído.'); carregar();
  }
  async function ajustarCapacidade(patioId, n) {
    const { error } = await supabase.from('patio').update({ capacidade_total: n }).eq('id', patioId);
    if (error) { aviso('Erro ao ajustar capacidade: ' + error.message, 'erro'); return; }
    aviso(`Capacidade ajustada para ${n}.`); carregar();
  }

  // Cria ou remove vagas para o total bater com `alvo`.
  // Ao remover, só apaga vagas LIVRES e SEM histórico de transações (o banco
  // não permite apagar vaga usada); nunca remove vaga ocupada.
  async function sincronizarVagas(patioId, alvo) {
    if (alvo == null || isNaN(alvo)) return null;
    const { data: allP } = await supabase.from('patio').select('id, nome');
    const prefMap = calcularPrefixos(allP ?? []);
    const pref = prefMap[patioId] || 'X';
    const { data: vs } = await supabase.from('vaga').select('id, numero, status').eq('patio_id', patioId);
    const atuais = vs ?? [];
    const nAtual = atuais.length;
    if (alvo === nAtual) return { criadas: 0, removidas: 0, bloqueadas: 0, finalCount: nAtual };

    if (alvo > nAtual) {
      let maxN = 0;
      atuais.forEach((v) => { const m = /(\d+)$/.exec(v.numero || ''); if (m) maxN = Math.max(maxN, parseInt(m[1], 10)); });
      const registros = [];
      for (let i = 0; i < alvo - nAtual; i++) { maxN++; registros.push({ uuid: crypto.randomUUID(), patio_id: patioId, numero: pref + maxN, tipo: 'comum', status: 'livre' }); }
      const { error } = await supabase.from('vaga').insert(registros);
      if (error) return { erro: error.message };
      return { criadas: registros.length, finalCount: nAtual + registros.length };
    }

    // precisa remover
    const remover = nAtual - alvo;
    const livres = atuais.filter((v) => v.status === 'livre');
    let removiveis = livres;
    const ids = livres.map((v) => v.id);
    if (ids.length) {
      const { data: tx } = await supabase.from('transacao').select('vaga_id').in('vaga_id', ids);
      const usados = new Set((tx ?? []).map((t) => t.vaga_id));
      removiveis = livres.filter((v) => !usados.has(v.id)); // livres e sem histórico
    }
    const aRemover = removiveis.slice(0, remover).map((v) => v.id);
    if (aRemover.length) {
      const { error } = await supabase.from('vaga').delete().in('id', aRemover);
      if (error) return { erro: error.message };
    }
    return { removidas: aRemover.length, bloqueadas: remover - aRemover.length, finalCount: nAtual - aRemover.length };
  }

  // ---------- vagas ----------
  async function addVaga(patioId) {
    const numero = proximoNumeroVaga(patioId); // nome automático (inicial do pátio + número)
    const { error } = await supabase.from('vaga').insert({
      uuid: crypto.randomUUID(), patio_id: patioId, numero, tipo: 'comum', status: 'livre',
    });
    if (error) { aviso('Erro ao criar vaga: ' + error.message, 'erro'); return; }
    aviso(`Vaga ${numero} criada.`); carregar();
  }
  async function salvarVaga(v) {
    const { error } = await supabase.from('vaga').update({ numero: v.numero, status: v.status }).eq('id', v.id);
    if (error) { aviso('Erro ao salvar vaga: ' + error.message, 'erro'); return; }
    setEditVaga((m) => ({ ...m, [v.id]: false }));
    aviso('Vaga salva.'); carregar();
  }
  async function excluirVaga(id) {
    const { error } = await supabase.from('vaga').delete().eq('id', id);
    if (error) { aviso('Não foi possível excluir a vaga: ' + error.message, 'erro'); return; }
    aviso('Vaga excluída.'); carregar();
  }

  function cancelar() { setEditPatio({}); setEditVaga({}); carregar(); }

  const grupos = patios.map((p) => ({ ...p, vagas: vagas.filter((v) => v.patio_id === p.id) }));
  const semPatio = vagas.filter((v) => !patios.some((p) => p.id === v.patio_id));

  return (
    <div style={s.page}>
      <div style={s.bgOverlay} />

      <header style={s.nav}>
        <div style={s.navInner}>
          <img src={igoLogo} alt="iGO" style={s.navLogo} />
          <MenuLateral atual="vagas" />
        </div>
      </header>

      <main style={s.content}>
        <div>
          <h1 style={s.title}>{souAdmin ? 'Gestão de Vagas e Pátios' : 'Consulta de Vagas'}</h1>
          <p style={s.subtitle}>
            {souAdmin ? 'Crie, edite e exclua pátios e vagas.' : 'Status de todas as vagas, por pátio'}
            {carregando ? ' — carregando...' : '.'}
          </p>
        </div>

        {msg && <div style={{ ...s.aviso, ...(msgTipo === 'erro' ? s.avisoErro : s.avisoOk) }}>{msg}</div>}

        {/* Novo pátio (admin) */}
        {souAdmin && (
          <div style={s.cardWrapper}>
            <span style={s.bracketTopRight} />
            <div style={s.card}>
              <h2 style={s.sectionTitle}>Novo pátio</h2>
              <div style={s.formRow}>
                <label style={s.field}>
                  <span style={s.fieldLabel}>Nome *</span>
                  <input style={s.input} value={novoPatio.nome} onChange={(e) => setNovoPatio({ ...novoPatio, nome: e.target.value })} placeholder="Ex.: Praia" />
                </label>
                <label style={{ ...s.field, flex: 1, minWidth: 200 }}>
                  <span style={s.fieldLabel}>Endereço</span>
                  <input style={s.input} value={novoPatio.endereco} onChange={(e) => setNovoPatio({ ...novoPatio, endereco: e.target.value })} placeholder="Ex.: Av. Boa Viagem, 1500" />
                </label>
                <label style={s.field}>
                  <span style={s.fieldLabel}>Capacidade</span>
                  <input style={{ ...s.input, width: 110 }} type="number" min="0" value={novoPatio.capacidade} onChange={(e) => setNovoPatio({ ...novoPatio, capacidade: e.target.value })} placeholder="Ex.: 8" />
                </label>
                <button style={s.button} onClick={addPatio}>Adicionar pátio</button>
              </div>
              {novoPatio.nome.trim() !== '' && (
                <p style={s.hint}>Será criado como: <b style={{ color: '#fff' }}>{normalizarNomePatio(novoPatio.nome)}</b></p>
              )}
            </div>
          </div>
        )}

        {grupos.map((g) => {
          const livres = g.vagas.filter((v) => v.status === 'livre').length;
          const ocupadas = g.vagas.length - livres;
          const editandoPatio = !!editPatio[g.id];
          const n = g.vagas.length;
          const cap = g.capacidade_total;
          return (
            <div key={g.id} style={s.cardWrapper}>
              <span style={s.bracketTopRight} />
              <div style={s.card}>
                <div style={s.patioHeader}>
                  <h2 style={s.sectionTitle}>{g.nome} {souAdmin && prefixos[g.id] && <span style={s.prefBadge}>vagas: {prefixos[g.id]}</span>}</h2>
                  <div style={s.resumoVagas}>
                    <span style={{ ...s.badge, color: LIME, borderColor: 'rgba(163,230,53,0.4)', background: 'rgba(163,230,53,0.12)' }}>{livres} livres</span>
                    <span style={{ ...s.badge, color: ORANGE, borderColor: 'rgba(249,96,0,0.4)', background: 'rgba(249,96,0,0.12)' }}>{ocupadas} ocupadas</span>
                  </div>
                </div>

                {/* Aviso de capacidade x nº de vagas (admin) */}
                {souAdmin && (cap == null || cap === '') && (
                  <div style={s.avisoCap}>
                    <span>Capacidade não definida para este pátio (vagas cadastradas: <b>{n}</b>).</span>
                    <button style={s.btnMiniGhost} onClick={() => ajustarCapacidade(g.id, n)}>Definir como {n}</button>
                  </div>
                )}
                {souAdmin && cap != null && cap !== '' && Number(cap) !== n && (
                  <div style={s.avisoCap}>
                    <span>Capacidade definida (<b>{cap}</b>) diferente do número de vagas (<b>{n}</b>).</span>
                    <button style={s.btnMiniGhost} onClick={() => ajustarCapacidade(g.id, n)}>Ajustar para {n}</button>
                  </div>
                )}

                {/* Dados do pátio (admin) — travados até "Editar" */}
                {souAdmin && (
                  <div style={s.editArea}>
                    {!editandoPatio ? (
                      <div style={s.leituraLinha}>
                        <span style={s.leituraTxt}><b>Endereço:</b> {g.endereco || '—'} &nbsp;·&nbsp; <b>Capacidade:</b> {g.capacidade_total ?? '—'}</span>
                        <button style={s.btnGhost} onClick={() => setEditPatio((m) => ({ ...m, [g.id]: true }))}>Editar pátio</button>
                      </div>
                    ) : (
                      <div style={s.formRow}>
                        <label style={s.field}>
                          <span style={s.fieldLabel}>Nome do pátio</span>
                          <input style={s.input} value={g.nome || ''} onChange={(e) => setPatioCampo(g.id, 'nome', e.target.value)} />
                        </label>
                        <label style={{ ...s.field, flex: 1, minWidth: 200 }}>
                          <span style={s.fieldLabel}>Endereço</span>
                          <input style={s.input} value={g.endereco || ''} onChange={(e) => setPatioCampo(g.id, 'endereco', e.target.value)} />
                        </label>
                        <label style={s.field}>
                          <span style={s.fieldLabel}>Capacidade</span>
                          <input style={{ ...s.input, width: 110 }} type="number" min="0" value={g.capacidade_total ?? ''} onChange={(e) => setPatioCampo(g.id, 'capacidade_total', e.target.value)} />
                        </label>
                        <button style={s.button} onClick={() => salvarPatio(g)}>Salvar</button>
                        <button style={s.btnGhost} onClick={cancelar}>Cancelar</button>
                        <button style={s.btnDanger} onClick={() => excluirPatio(g.id)}>Excluir pátio</button>
                      </div>
                    )}
                  </div>
                )}

                {/* Vagas */}
                {souAdmin ? (
                  <div style={s.tableResponsive}>
                    <table style={s.table}>
                      <thead>
                        <tr>
                          <th style={s.th}>Número</th>
                          <th style={s.th}>Status</th>
                          <th style={s.th}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.vagas.map((v) => {
                          const editandoVaga = !!editVaga[v.id];
                          return (
                            <tr key={v.id} style={s.tr}>
                              <td style={s.td}>
                                {editandoVaga
                                  ? <input style={{ ...s.input, width: 90 }} value={v.numero || ''} onChange={(e) => setVagaCampo(v.id, 'numero', e.target.value)} />
                                  : <span style={s.tdBoldTxt}>{v.numero}</span>}
                              </td>
                              <td style={s.td}>
                                {editandoVaga
                                  ? (
                                    <select style={s.input} value={v.status || 'livre'} onChange={(e) => setVagaCampo(v.id, 'status', e.target.value)}>
                                      <option value="livre">livre</option>
                                      <option value="ocupada">ocupada</option>
                                    </select>
                                  )
                                  : <span style={{ color: v.status === 'livre' ? LIME : ORANGE, fontWeight: 600 }}>{v.status}</span>}
                              </td>
                              <td style={s.td}>
                                {editandoVaga ? (
                                  <>
                                    <button style={s.btnMini} onClick={() => salvarVaga(v)}>Salvar</button>
                                    <button style={s.btnMiniGhost} onClick={cancelar}>Cancelar</button>
                                    <button style={s.btnMiniDanger} onClick={() => excluirVaga(v.id)}>Excluir</button>
                                  </>
                                ) : (
                                  <button style={s.btnMiniGhost} onClick={() => setEditVaga((m) => ({ ...m, [v.id]: true }))}>Editar</button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {g.vagas.length === 0 && <tr><td style={s.td} colSpan={3}>Nenhuma vaga neste pátio.</td></tr>}
                        <tr style={s.trNova}>
                          <td style={s.td} colSpan={2}>
                            <span style={s.hint}>Próxima vaga: <b style={{ color: '#fff' }}>{proximoNumeroVaga(g.id)}</b> (nome automático)</span>
                          </td>
                          <td style={s.td}><button style={s.btnMini} onClick={() => addVaga(g.id)}>Adicionar vaga</button></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={s.vagasWrap}>
                    {g.vagas.map((v) => (
                      <span key={v.id} style={{
                        ...s.vagaTag,
                        background: v.status === 'livre' ? 'rgba(163,230,53,0.12)' : 'rgba(249,96,0,0.12)',
                        color: v.status === 'livre' ? LIME : ORANGE,
                        borderColor: v.status === 'livre' ? 'rgba(163,230,53,0.4)' : 'rgba(249,96,0,0.4)',
                      }}>
                        {v.numero} · {v.status}
                      </span>
                    ))}
                    {g.vagas.length === 0 && <p style={s.hint}>Nenhuma vaga neste pátio.</p>}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {semPatio.length > 0 && (
          <div style={s.cardWrapper}>
            <span style={s.bracketTopRight} />
            <div style={s.card}>
              <h2 style={s.sectionTitle}>Sem pátio</h2>
              <div style={s.vagasWrap}>
                {semPatio.map((v) => (
                  <span key={v.id} style={{ ...s.vagaTag, background: 'rgba(255,255,255,0.06)', color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>{v.numero} · {v.status}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {!carregando && grupos.length === 0 && <p style={s.hint}>Nenhum pátio cadastrado.</p>}
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
  patioHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 },
  prefBadge: { marginLeft: 8, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(249,96,0,0.18)', border: '1px solid rgba(249,96,0,0.45)', color: ORANGE, verticalAlign: 'middle' },
  resumoVagas: { display: 'flex', gap: 8 },
  badge: { padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: '1px solid' },
  avisoCap: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '8px 12px', borderRadius: 4, background: 'rgba(249,96,0,0.12)', border: '1px solid rgba(249,96,0,0.4)', color: '#ffd9bf', fontSize: 12.5, fontWeight: 600 },
  editArea: { paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.1)' },
  leituraLinha: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  leituraTxt: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  formRow: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  fieldLabel: { fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' },
  input: { padding: '8px 10px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 13, outline: 'none', colorScheme: 'dark' },
  button: { padding: '9px 16px', borderRadius: 4, border: 'none', backgroundColor: ORANGE, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  btnGhost: { padding: '9px 16px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnDanger: { padding: '9px 16px', borderRadius: 4, border: '1px solid rgba(255,120,120,0.5)', background: 'rgba(255,80,80,0.12)', color: '#ffb4a2', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  btnMini: { padding: '5px 10px', borderRadius: 4, border: 'none', backgroundColor: ORANGE, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', marginRight: 6 },
  btnMiniGhost: { padding: '5px 10px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginRight: 6 },
  btnMiniDanger: { padding: '5px 10px', borderRadius: 4, border: '1px solid rgba(255,120,120,0.5)', background: 'rgba(255,80,80,0.12)', color: '#ffb4a2', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  vagasWrap: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  vagaTag: { padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: '1px solid' },
  hint: { fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 },
  tableResponsive: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '10px 12px', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', borderBottom: '1px solid rgba(255,255,255,0.15)', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.08)' },
  trNova: { borderTop: '1px solid rgba(255,255,255,0.15)' },
  td: { padding: '10px 12px', fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  tdBoldTxt: { fontSize: 13, fontWeight: 700, color: '#fff' },
  bracketTopRight: { position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderTop: `3px solid ${ORANGE}`, borderRight: `3px solid ${ORANGE}`, pointerEvents: 'none', zIndex: 2 },
};
