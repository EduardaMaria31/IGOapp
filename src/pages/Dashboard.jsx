import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import igoLogo from '../assets/logo-igo-10.png';
import bgEstacionamento from '../assets/estacionamento-bg.jpeg';


const NAVY = '#00167a';
const NAVY_DARK = '#000d47';
const ORANGE = '#f96000';
const LIME = '#a3e635';
const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

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
// Linha de informação usada no cartão de detalhes do veículo
function Info({ label, valor }) {
  return (
    <div style={styles.infoRow}>
      <span style={styles.infoLabel}>{label}</span>
      <span style={styles.infoValue}>{valor ?? '—'}</span>
    </div>
  );
}

// O banco guarda o horário em UTC (timestamp sem fuso). Esta função lê a
// string como UTC para os cálculos e a exibição saírem no horário de Brasília.
function paraData(ts) {
  if (!ts) return null;
  let iso = String(ts).trim().replace(' ', 'T');
  if (!/[zZ]|[+-]\d\d:?\d\d$/.test(iso)) iso += 'Z';
  return new Date(iso);
}
// Formata um timestamp como HH:MM no horário de Brasília
function horaBR(ts) {
  const d = paraData(ts);
  return d ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '—';
}
// Tempo decorrido desde um timestamp, como "1h 20m"
function tempoDesde(ts) {
  const d = paraData(ts);
  if (!d) return '—';
  const min = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

// Controle de paginação (10 itens por página) para as tabelas.
// Não aparece quando há 10 itens ou menos.
function Paginacao({ total, pagina, setPagina }) {
  const totalPaginas = Math.max(1, Math.ceil(total / 10));
  if (total <= 10) return null;
  const estilo = (dis) => ({ ...styles.pagBtn, opacity: dis ? 0.4 : 1, cursor: dis ? 'default' : 'pointer' });
  return (
    <div style={styles.paginacao}>
      <button style={estilo(pagina <= 1)} disabled={pagina <= 1}
        onClick={() => setPagina((p) => Math.max(1, p - 1))}>‹ Anterior</button>
      <span style={styles.pagInfo}>Página {pagina} de {totalPaginas}</span>
      <button style={estilo(pagina >= totalPaginas)} disabled={pagina >= totalPaginas}
        onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}>Próxima ›</button>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [userRole, setUserRole] = useState('operador');
  const [carregando, setCarregando] = useState(true);

  // Agora começam vazios/zerados e são preenchidos com dados reais
  const [resumo, setResumo] = useState({
    vagasLivres: 0,
    vagasOcupadas: 0,
    totalVagas: 0,
    veiculosEstacionados: 0,
    faturamentoDia: 0,
  });

  const [patios, setPatios] = useState([]);
  const [veiculosEstacionados, setVeiculosEstacionados] = useState([]);
  const [historicoRecente, setHistoricoRecente] = useState([]);
  const [pagVeic, setPagVeic] = useState(1);   // paginação: veículos no pátio
  const [pagHist, setPagHist] = useState(1);   // paginação: histórico
  const [detalheVeic, setDetalheVeic] = useState(null); // cartão de detalhes do veículo

  // ===== Inteligência Artificial (dados reais do Supabase) =====
  const [painel, setPainel] = useState(null);
  const [iaPatios, setIaPatios] = useState([]);
  const [iaPatio, setIaPatio] = useState('');
  const [iaDia, setIaDia] = useState(String(new Date().getDay()));
  const [iaHora, setIaHora] = useState('18');
  const [iaPrev, setIaPrev] = useState(null);
  const [iaMsg, setIaMsg] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setCarregando(true);
    setPagVeic(1); setPagHist(1);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const role = user.user_metadata?.role || 'operador';
        setUserRole(role);
      }

      // Painel de insights (IA) — alimenta também os cards de resumo e a ocupação por pátio
      const { data: p } = await supabase.rpc('painel_ia');
      if (p) {
        setPainel(p);
        setResumo({
          vagasLivres: p.vagas_livres ?? 0,
          vagasOcupadas: p.vagas_ocupadas ?? 0,
          totalVagas: p.vagas_total ?? 0,
          veiculosEstacionados: p.carros_no_patio ?? 0,
          faturamentoDia: Number(p.faturamento_hoje ?? 0),
        });
        setPatios((p.por_patio ?? []).map((x, i) => ({
          id: i, nome: x.nome, ocupadas: x.ocupadas, total: x.total,
        })));
      }

      // Pátios reais para o seletor da previsão
      const { data: ps } = await supabase.from('patio').select('id, nome').order('nome');
      if (ps) {
        setIaPatios(ps);
        if (ps.length) setIaPatio(String(ps[0].id));
      }

      // Veículos estacionados agora (transações abertas)
      const { data: ativos } = await supabase
        .from('transacao')
        .select('id, hora_entrada, veiculo:veiculo_id ( placa, modelo, tipo_veiculo, proprietario_nome, proprietario_telefone ), vaga:vaga_id ( numero )')
        .is('hora_saida', null)
        .order('hora_entrada', { ascending: false });
      setVeiculosEstacionados((ativos ?? []).map((t) => ({
        id: t.id,
        placa: t.veiculo?.placa ?? '—',
        modelo: t.veiculo?.modelo ?? '—',
        tipo: t.veiculo?.tipo_veiculo ?? '—',
        proprietario: t.veiculo?.proprietario_nome || 'Não informado',
        telefone: t.veiculo?.proprietario_telefone || 'Não informado',
        vaga: t.vaga?.numero ?? '—',
        entrada: horaBR(t.hora_entrada),
        tempo: tempoDesde(t.hora_entrada),
      })));

      // Histórico recente (transações finalizadas)
      const { data: hist } = await supabase
        .from('transacao')
        .select('id, hora_entrada, hora_saida, valor_calculado, veiculo:veiculo_id ( placa, modelo, tipo_veiculo, proprietario_nome, proprietario_telefone ), vaga:vaga_id ( numero )')
        .not('hora_saida', 'is', null)
        .order('hora_saida', { ascending: false })
        .limit(200);
      setHistoricoRecente((hist ?? []).map((t) => ({
        id: t.id,
        placa: t.veiculo?.placa ?? '—',
        modelo: t.veiculo?.modelo ?? '—',
        tipo: t.veiculo?.tipo_veiculo ?? '—',
        proprietario: t.veiculo?.proprietario_nome || 'Não informado',
        telefone: t.veiculo?.proprietario_telefone || 'Não informado',
        vaga: t.vaga?.numero ?? '—',
        entrada: horaBR(t.hora_entrada),
        saida: horaBR(t.hora_saida),
        valor: Number(t.valor_calculado || 0),
      })));

    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setCarregando(false);
    }
  }

  function recomendacaoIA() {
    const p = painel;
    if (!p) return '';
    const pico = p.horario_pico != null ? `${p.horario_pico}h` : '—';
    const diaNome = p.dia_pico != null ? DIAS[p.dia_pico] : '—';
    let tarifa;
    if (p.ocupacao_pct >= 80) tarifa = 'A ocupação está alta — bom momento para aplicar tarifa de pico.';
    else if (p.ocupacao_pct <= 30) tarifa = 'A ocupação está baixa — considere um desconto para atrair mais veículos.';
    else tarifa = 'A ocupação está em nível normal.';
    return `Ocupação atual de ${p.ocupacao_pct}%. O movimento costuma ser maior por volta das ${pico}, sobretudo na ${diaNome}. ${tarifa}`;
  }

  async function preverIA(e) {
    e.preventDefault();
    setIaMsg(''); setIaPrev(null);
    if (!iaPatio) { setIaMsg('Escolha um pátio.'); return; }
    const { data, error } = await supabase.rpc('previsao_completa', {
      p_patio: Number(iaPatio), p_dia: Number(iaDia), p_hora: Number(iaHora),
    });
    if (error) { setIaMsg('Erro: ' + error.message); return; }
    setIaPrev(data);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  return (
    <div style={styles.page}>
      <div style={styles.bgOverlay} />

      <header style={styles.nav}>
        <div style={styles.navInner}>
          <img src={igoLogo} alt="iGO" style={styles.navLogo} />
          <div style={styles.navRight}>
            <span style={styles.userInfo}>
              Perfil: <strong>{userRole.toUpperCase()}</strong>
            </span>
            <button onClick={() => navigate('/operacao')} style={styles.logoutBtn}>
              Operação
            </button>
            <button onClick={handleLogout} style={styles.logoutBtn}>
              Sair
            </button>
          </div>
        </div>
      </header>

      <main style={styles.content}>
        <div style={styles.headerTitleArea}>
          <h1 style={styles.title}>Painel Principal</h1>
          <p style={styles.subtitle}>
            Visão geral do sistema de estacionamento{carregando ? ' — carregando...' : ''}
          </p>
        </div>

        {/* Atalhos do Administrador (Apenas Admin vê) */}
        {userRole === 'admin' && (
          <section style={styles.adminSection}>
            <div style={styles.cardWrapper}>
              <span style={styles.bracketTopRight} />
              <div style={styles.adminBar}>
                <span style={styles.adminBarTitle}>Atalhos de Gestão:</span>
                <button onClick={() => navigate('/gestao-patios')} style={styles.adminBtn}>Gestão de Pátios</button>
                <button onClick={() => navigate('/gestao-precos')} style={styles.adminBtn}>Gestão de Preços</button>
                <button onClick={() => navigate('/gestao-usuarios')} style={styles.adminBtn}>Usuários</button>
              </div>
            </div>
          </section>
        )}

        {/* 1. CARDS DE RESUMO NO TOPO */}
        <section style={styles.cardsGrid}>
          <div style={styles.cardWrapper}>
            <span style={styles.bracketTopRight} />
            <div style={styles.metricCard}>
              <span style={styles.metricLabel}>Vagas Livres / Ocupadas</span>
              <div style={styles.metricValue}>
                <span style={{ color: LIME }}>{resumo.vagasLivres}</span> /{' '}
                <span style={{ color: ORANGE }}>{resumo.vagasOcupadas}</span>
              </div>
              <span style={styles.metricSub}>Total: {resumo.totalVagas} vagas</span>
            </div>
          </div>

          <div style={styles.cardWrapper}>
            <span style={styles.bracketTopRight} />
            <div style={styles.metricCard}>
              <span style={styles.metricLabel}>Veículos Estacionados Agora</span>
              <div style={styles.metricValue}>{resumo.veiculosEstacionados}</div>
              <span style={styles.metricSub}>Status: em andamento</span>
            </div>
          </div>

          <div style={styles.cardWrapper}>
            <span style={styles.bracketTopRight} />
            <div style={styles.metricCard}>
              <span style={styles.metricLabel}>Faturamento do Dia</span>
              <div style={{ ...styles.metricValue, color: LIME }}>
                R$ {resumo.faturamentoDia.toFixed(2)}
              </div>
              <span style={styles.metricSub}>Atualizado hoje</span>
            </div>
          </div>
        </section>

        {/* 2. OCUPAÇÃO POR PÁTIO */}
        <section style={styles.sectionContainer}>
          <h2 style={styles.sectionTitle}>Ocupação por Pátio</h2>
          <div style={styles.patiosGrid}>
            {patios.map((p) => {
              const porcentagem = p.total > 0 ? Math.round((p.ocupadas / p.total) * 100) : 0;
              return (
                <div key={p.id} style={styles.cardWrapper}>
                  <span style={styles.bracketBottomLeft} />
                  <div style={styles.patioCard}>
                    <div style={styles.patioHeader}>
                      <span style={styles.patioName}>{p.nome}</span>
                      <span style={styles.patioBadge}>{porcentagem}% ocupado</span>
                    </div>
                    <div style={styles.progressBarBg}>
                      <div style={{ ...styles.progressBarFill, width: `${porcentagem}%` }} />
                    </div>
                    <p style={styles.patioDetail}>
                      <strong>{p.ocupadas}</strong> de <strong>{p.total}</strong> vagas ocupadas
                    </p>
                  </div>
                </div>
              );
            })}
            {patios.length === 0 && !carregando && (
              <p style={styles.patioDetail}>Nenhum pátio cadastrado.</p>
            )}
          </div>
        </section>

        {/* 3 & 4. TABELAS (ESTACIONADOS AGORA E HISTÓRICO RECENTE) */}
        <section style={styles.tablesGrid}>
          {/* Tabela de Estacionados Agora */}
          <div style={styles.cardWrapper}>
            <span style={styles.bracketTopRight} />
            <div style={styles.tableCard}>
              <h2 style={styles.tableTitle}>Veículos Estacionados Agora</h2>
              <div style={styles.tableResponsive}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Placa</th>
                      <th style={styles.th}>Modelo</th>
                      <th style={styles.th}>Tipo</th>
                      <th style={styles.th}>Vaga</th>
                      <th style={styles.th}>Entrada</th>
                      <th style={styles.th}>Tempo</th>
                      <th style={styles.th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {veiculosEstacionados.slice((pagVeic - 1) * 10, pagVeic * 10).map((item) => (
                      <tr key={item.id} style={styles.tr}>
                        <td style={styles.tdBold}>{item.placa}</td>
                        <td style={styles.td}>{item.modelo}</td>
                        <td style={styles.td}>{tipoLabel(item.tipo)}</td>
                        <td style={styles.td}>{item.vaga}</td>
                        <td style={styles.td}>{item.entrada}</td>
                        <td style={{ ...styles.td, color: ORANGE }}>{item.tempo}</td>
                        <td style={styles.td}>
                          <button style={styles.olhoBtn} title="Ver detalhes" onClick={() => setDetalheVeic(item)}><IconeOlho /></button>
                        </td>
                      </tr>
                    ))}
                    {veiculosEstacionados.length === 0 && (
                      <tr><td style={styles.td} colSpan={7}>Nenhum veículo no pátio agora.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Paginacao total={veiculosEstacionados.length} pagina={pagVeic} setPagina={setPagVeic} />
            </div>
          </div>

          {/* Tabela de Histórico Recente */}
          <div style={styles.cardWrapper}>
            <span style={styles.bracketBottomLeft} />
            <div style={styles.tableCard}>
              <h2 style={styles.tableTitle}>Histórico Recente</h2>
              <div style={styles.tableResponsive}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Placa</th>
                      <th style={styles.th}>Tipo</th>
                      <th style={styles.th}>Vaga</th>
                      <th style={styles.th}>Entrada</th>
                      <th style={styles.th}>Saída</th>
                      <th style={styles.th}>Valor</th>
                      <th style={styles.th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicoRecente.slice((pagHist - 1) * 10, pagHist * 10).map((item) => (
                      <tr key={item.id} style={styles.tr}>
                        <td style={styles.tdBold}>{item.placa}</td>
                        <td style={styles.td}>{tipoLabel(item.tipo)}</td>
                        <td style={styles.td}>{item.vaga}</td>
                        <td style={styles.td}>{item.entrada}</td>
                        <td style={styles.td}>{item.saida}</td>
                        <td style={{ ...styles.td, color: LIME }}>R$ {item.valor.toFixed(2)}</td>
                        <td style={styles.td}>
                          <button style={styles.olhoBtn} title="Ver detalhes" onClick={() => setDetalheVeic(item)}><IconeOlho /></button>
                        </td>
                      </tr>
                    ))}
                    {historicoRecente.length === 0 && (
                      <tr><td style={styles.td} colSpan={7}>Nenhuma saída registrada ainda.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Paginacao total={historicoRecente.length} pagina={pagHist} setPagina={setPagHist} />
            </div>
          </div>
        </section>

        {/* ===== INTELIGÊNCIA ARTIFICIAL (dados reais) ===== */}
        <section style={styles.sectionContainer}>
          <h2 style={styles.sectionTitle}>Inteligência Artificial</h2>

          {/* Recomendação em linguagem natural */}
          <div style={styles.cardWrapper}>
            <span style={styles.bracketTopRight} />
            <div style={styles.aiCard}>
              <span style={styles.aiBadge}>Recomendação da IA</span>
              <p style={styles.aiText}>
                {painel ? recomendacaoIA() : 'Analisando os dados do sistema...'}
              </p>
            </div>
          </div>

          {/* Chips de insight */}
          {painel && (
            <div style={styles.iaChips}>
              <div style={styles.iaChip}>
                <span style={styles.iaChipLabel}>Ocupação geral</span>
                <span style={styles.iaChipValue}>{painel.ocupacao_pct}%</span>
              </div>
              <div style={styles.iaChip}>
                <span style={styles.iaChipLabel}>Horário de pico</span>
                <span style={styles.iaChipValue}>{painel.horario_pico != null ? painel.horario_pico + 'h' : '—'}</span>
              </div>
              <div style={styles.iaChip}>
                <span style={styles.iaChipLabel}>Dia mais movimentado</span>
                <span style={styles.iaChipValue}>{painel.dia_pico != null ? DIAS[painel.dia_pico] : '—'}</span>
              </div>
              <div style={styles.iaChip}>
                <span style={styles.iaChipLabel}>Ticket médio</span>
                <span style={styles.iaChipValue}>R$ {Number(painel.ticket_medio).toFixed(2)}</span>
              </div>
              <div style={styles.iaChip}>
                <span style={styles.iaChipLabel}>Permanência média</span>
                <span style={styles.iaChipValue}>{painel.permanencia_media_min} min</span>
              </div>
            </div>
          )}

          {/* Previsão de ocupação e preço */}
          <div style={styles.cardWrapper}>
            <span style={styles.bracketBottomLeft} />
            <div style={styles.metricCard}>
              <span style={styles.metricLabel}>Previsão de ocupação e preço sugerido</span>
              <form onSubmit={preverIA} style={styles.iaForm}>
                <label style={styles.iaField}>
                  <span style={styles.iaFieldLabel}>Pátio</span>
                  <select style={styles.iaInput} value={iaPatio} onChange={(e) => setIaPatio(e.target.value)}>
                    {iaPatios.length === 0 && <option value="">Nenhum pátio</option>}
                    {iaPatios.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </label>
                <label style={styles.iaField}>
                  <span style={styles.iaFieldLabel}>Dia da semana</span>
                  <select style={styles.iaInput} value={iaDia} onChange={(e) => setIaDia(e.target.value)}>
                    {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </label>
                <label style={styles.iaField}>
                  <span style={styles.iaFieldLabel}>Hora (0–23)</span>
                  <input style={styles.iaInput} type="number" min="0" max="23" value={iaHora} onChange={(e) => setIaHora(e.target.value)} placeholder="Ex.: 18" />
                </label>
                <button type="submit" style={styles.iaButton}>Prever</button>
              </form>
              {iaMsg && <p style={{ color: '#ffb4a2', fontSize: 13, margin: '8px 0 0' }}>{iaMsg}</p>}
              {iaPrev && (
                <div style={styles.iaResultRow}>
                  <div>
                    <div style={{ ...styles.metricValue, color: LIME }}>{Math.round(iaPrev.ocupacao_prevista * 100)}%</div>
                    <span style={styles.metricSub}>Ocupação prevista</span>
                  </div>
                  <div>
                    <div style={{ ...styles.metricValue, color: ORANGE }}>R$ {Number(iaPrev.preco_sugerido).toFixed(2)}</div>
                    <span style={styles.metricSub}>Preço sugerido</span>
                  </div>
                  <p style={{ ...styles.aiText, flexBasis: '100%', marginTop: 4 }}>{iaPrev.explicacao}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {detalheVeic && (
        <div style={styles.modalOverlay} onClick={() => setDetalheVeic(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Detalhes do veículo</h3>
              <button style={styles.modalClose} onClick={() => setDetalheVeic(null)}>✕</button>
            </div>
            <Info label="Placa" valor={detalheVeic.placa} />
            <Info label="Modelo" valor={detalheVeic.modelo} />
            <Info label="Tipo" valor={tipoLabel(detalheVeic.tipo)} />
            <Info label="Proprietário" valor={detalheVeic.proprietario} />
            <Info label="Telefone" valor={detalheVeic.telefone} />
            <Info label="Vaga" valor={detalheVeic.vaga} />
            <Info label="Entrada" valor={detalheVeic.entrada} />
            {detalheVeic.saida && <Info label="Saída" valor={detalheVeic.saida} />}
            {detalheVeic.valor != null && <Info label="Valor cobrado" valor={'R$ ' + Number(detalheVeic.valor).toFixed(2)} />}
          </div>
        </div>
      )}

      <style>{`
        *, *::before, *::after {
          box-sizing: border-box;
        }
        html, body, #root {
          margin: 0;
          width: 100vw;
          min-height: 100vh;
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    width: '100vw',
    position: 'relative',
    overflowX: 'hidden',
    backgroundImage: `url(${bgEstacionamento})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  bgOverlay: {
    position: 'fixed',
    inset: 0,
    background: `linear-gradient(100deg, rgba(0,13,71,0.65) 0%, rgba(0,22,122,0.85) 45%, ${NAVY} 85%, ${NAVY_DARK} 100%)`,
    zIndex: 0,
  },
  nav: {
    position: 'relative',
    zIndex: 2,
    padding: '20px 48px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(0,13,71,0.4)',
    backdropFilter: 'blur(10px)',
  },
  navInner: {
    width: '100%',
    maxWidth: 1200,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navLogo: { height: 60, objectFit: 'contain', mixBlendMode: 'screen' },
  navRight: { display: 'flex', alignItems: 'center', gap: 20 },
  userInfo: { color: 'rgba(255,255,255,0.85)', fontSize: 14 },
  logoutBtn: {
    padding: '8px 16px',
    borderRadius: 4,
    border: '1px solid rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    maxWidth: 1200,
    width: '90%',
    margin: '0 auto',
    padding: '32px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  headerTitleArea: { color: '#fff' },
  title: { fontSize: 32, fontWeight: 800, margin: '0 0 6px' },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.75)', margin: 0 },

  adminSection: { width: '100%' },
  adminBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '16px 24px',
    borderRadius: 4,
    background: 'rgba(249, 96, 0, 0.15)',
    border: '1px solid rgba(249, 96, 0, 0.4)',
    backdropFilter: 'blur(14px)',
    flexWrap: 'wrap',
  },
  adminBarTitle: { color: '#fff', fontWeight: 700, fontSize: 14, marginRight: 8 },
  adminBtn: {
    padding: '8px 14px',
    borderRadius: 4,
    border: 'none',
    backgroundColor: ORANGE,
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },

  cardsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 },
  cardWrapper: { position: 'relative', width: '100%' },
  metricCard: {
    padding: '24px',
    borderRadius: 4,
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.18)',
    boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  metricLabel: { fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)' },
  metricValue: { fontSize: 28, fontWeight: 800, color: '#fff' },
  metricSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },

  sectionContainer: { display: 'flex', flexDirection: 'column', gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 },
  patiosGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 },
  patioCard: {
    padding: '20px',
    borderRadius: 4,
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.18)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  patioHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  patioName: { fontSize: 16, fontWeight: 700, color: '#fff' },
  patioBadge: {
    fontSize: 12,
    fontWeight: 700,
    color: ORANGE,
    backgroundColor: 'rgba(249, 96, 0, 0.15)',
    padding: '4px 8px',
    borderRadius: 4,
  },
  progressBarBg: { width: '100%', height: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: ORANGE, transition: 'width 0.4s ease' },
  patioDetail: { margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.85)' },

  tablesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20 },
  tableCard: {
    padding: '24px',
    borderRadius: 4,
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.18)',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  tableTitle: { fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 },
  tableResponsive: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: {
    padding: '10px 12px',
    fontSize: 12,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.6)',
    borderBottom: '1px solid rgba(255,255,255,0.15)',
    textTransform: 'uppercase',
  },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.08)' },
  td: { padding: '12px', fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  tdBold: { padding: '12px', fontSize: 13, fontWeight: 700, color: '#fff' },

  aiCard: {
    padding: '16px 20px',
    borderRadius: 4,
    background: 'rgba(0, 22, 122, 0.4)',
    border: '1px solid rgba(255,255,255,0.2)',
    backdropFilter: 'blur(14px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  aiBadge: { fontSize: 12, fontWeight: 700, color: LIME },
  aiText: { margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 1.4 },

  iaChips: { display: 'flex', flexWrap: 'wrap', gap: 12 },
  iaChip: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '10px 16px',
    borderRadius: 4,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.18)',
    backdropFilter: 'blur(14px)',
    minWidth: 130,
  },
  iaChipLabel: { fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' },
  iaChipValue: { fontSize: 20, fontWeight: 800, color: '#fff' },
  iaForm: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 4 },
  iaField: { display: 'flex', flexDirection: 'column', gap: 4 },
  iaFieldLabel: { fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' },
  iaInput: {
    padding: '9px 12px',
    borderRadius: 4,
    border: '1px solid rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    colorScheme: 'dark',
  },
  iaButton: {
    padding: '9px 18px',
    borderRadius: 4,
    border: 'none',
    backgroundColor: ORANGE,
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  iaResultRow: { display: 'flex', flexWrap: 'wrap', gap: 32, marginTop: 14, alignItems: 'flex-start' },
  paginacao: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
  pagBtn: { padding: '6px 12px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: '#fff', fontSize: 13, fontWeight: 600 },
  pagInfo: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  olhoBtn: { background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(255,255,255,0.85)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', verticalAlign: 'middle' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, animation: 'fadeIn 0.2s ease' },
  modalCard: { width: '100%', maxWidth: 420, background: '#0a1f6b', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.5)', animation: 'popIn 0.2s ease' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' },
  modalClose: { background: 'transparent', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' },
  infoRow: { display: 'flex', justifyContent: 'space-between', gap: 16, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' },
  infoLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 600 },
  infoValue: { fontSize: 14, color: '#fff', textAlign: 'right' },

  bracketTopRight: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderTop: `3px solid ${ORANGE}`,
    borderRight: `3px solid ${ORANGE}`,
    pointerEvents: 'none',
    zIndex: 2,
  },
  bracketBottomLeft: {
    position: 'absolute',
    bottom: -8,
    left: -8,
    width: 24,
    height: 24,
    borderBottom: `3px solid ${ORANGE}`,
    borderLeft: `3px solid ${ORANGE}`,
    pointerEvents: 'none',
    zIndex: 2,
  },
};
