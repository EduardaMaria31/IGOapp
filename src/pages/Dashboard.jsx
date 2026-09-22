import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import igoLogo from '../assets/logo-igo-10.png';
import bgEstacionamento from '../assets/estacionamento-bg.jpeg';


const NAVY = '#00167a';
const NAVY_DARK = '#000d47';
const ORANGE = '#f96000';

export default function Dashboard() {
  const navigate = useNavigate();

  
  const [userRole, setUserRole] = useState('operador'); 
  const [carregando, setCarregando] = useState(true);

  
  const [resumo, setResumo] = useState({
    vagasLivres: 45,
    vagasOcupadas: 15,
    totalVagas: 60,
    veiculosEstacionados: 15,
    faturamentoDia: 450.0,
  });

  const [patios, setPatios] = useState([
    { id: 1, nome: 'Pátio Centro', ocupadas: 10, total: 30 },
    { id: 2, nome: 'Pátio Shopping', ocupadas: 5, total: 30 },
  ]);

  const [veiculosEstacionados, setVeiculosEstacionados] = useState([
    {
      id: '1',
      placa: 'ABC-1234',
      modelo: 'Civic Silver',
      vaga: 'A-01',
      entrada: '08:15',
      tempo: '1h 20m',
    },
    {
      id: '2',
      placa: 'XYZ-9876',
      modelo: 'Corolla Black',
      vaga: 'B-04',
      entrada: '09:00',
      tempo: '0h 35m',
    },
  ]);

  const [historicoRecente, setHistoricoRecente] = useState([
    {
      id: '101',
      placa: 'KGU-4412',
      vaga: 'A-05',
      entrada: '07:30',
      saida: '09:10',
      valor: 20.0,
    },
    {
      id: '102',
      placa: 'JHY-9921',
      vaga: 'B-02',
      entrada: '08:00',
      saida: '08:45',
      valor: 15.0,
    },
  ]);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setCarregando(true);
    try {
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        
        const role = user.user_metadata?.role || 'operador';
        setUserRole(role);
      }


    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setCarregando(false);
    }
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
            <button onClick={handleLogout} style={styles.logoutBtn}>
              Sair
            </button>
          </div>
        </div>
      </header>

      
      <main style={styles.content}>
        <div style={styles.headerTitleArea}>
          <h1 style={styles.title}>Painel Principal</h1>
          <p style={styles.subtitle}>Visão geral do sistema de estacionamento</p>
        </div>

        {/* Atalhos do Administrador (Apenas Admin vê) */}
        {userRole === 'admin' && (
          <section style={styles.adminSection}>
            <div style={styles.cardWrapper}>
              <span style={styles.bracketTopRight} />
              <div style={styles.adminBar}>
                <span style={styles.adminBarTitle}>Atalhos de Gestão:</span>
                <button
                  onClick={() => navigate('/gestao-patios')}
                  style={styles.adminBtn}
                >
                  Gestão de Pátios
                </button>
                <button
                  onClick={() => navigate('/gestao-precos')}
                  style={styles.adminBtn}
                >
                  Gestão de Preços
                </button>
                <button
                  onClick={() => navigate('/gestao-usuarios')}
                  style={styles.adminBtn}
                >
                  Usuários
                </button>
              </div>
            </div>
          </section>
        )}

        {/* 1. CARDS DE RESUMO NO TOPO */}
        <section style={styles.cardsGrid}>
          <div style={styles.cardWrapper}>
            <span style={styles.bracketTopRight} />
            <div style={styles.metricCard}>
              <span style={styles.metricLabel}>Vagas Libres / Ocupadas</span>
              <div style={styles.metricValue}>
                <span style={{ color: '#a3e635' }}>{resumo.vagasLivres}</span> /{' '}
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
              <div style={{ ...styles.metricValue, color: '#a3e635' }}>
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
              const porcentagem = Math.round((p.ocupadas / p.total) * 100);
              return (
                <div key={p.id} style={styles.cardWrapper}>
                  <span style={styles.bracketBottomLeft} />
                  <div style={styles.patioCard}>
                    <div style={styles.patioHeader}>
                      <span style={styles.patioName}>{p.nome}</span>
                      <span style={styles.patioBadge}>{porcentagem}% ocupado</span>
                    </div>
                    <div style={styles.progressBarBg}>
                      <div
                        style={{
                          ...styles.progressBarFill,
                          width: `${porcentagem}%`,
                        }}
                      />
                    </div>
                    <p style={styles.patioDetail}>
                      <strong>{p.ocupadas}</strong> de <strong>{p.total}</strong> vagas ocupadas
                    </p>
                  </div>
                </div>
              );
            })}
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
                      <th style={styles.th}>Vaga</th>
                      <th style={styles.th}>Entrada</th>
                      <th style={styles.th}>Tempo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {veiculosEstacionados.map((item) => (
                      <tr key={item.id} style={styles.tr}>
                        <td style={styles.tdBold}>{item.placa}</td>
                        <td style={styles.td}>{item.modelo}</td>
                        <td style={styles.td}>{item.vaga}</td>
                        <td style={styles.td}>{item.entrada}</td>
                        <td style={{ ...styles.td, color: ORANGE }}>{item.tempo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                      <th style={styles.th}>Vaga</th>
                      <th style={styles.th}>Entrada</th>
                      <th style={styles.th}>Saída</th>
                      <th style={styles.th}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicoRecente.map((item) => (
                      <tr key={item.id} style={styles.tr}>
                        <td style={styles.tdBold}>{item.placa}</td>
                        <td style={styles.td}>{item.vaga}</td>
                        <td style={styles.td}>{item.entrada}</td>
                        <td style={styles.td}>{item.saida}</td>
                        <td style={{ ...styles.td, color: '#a3e635' }}>
                          R$ {item.valor.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* ESPAÇO RESERVADO PARA IA */}
        <section style={{ marginTop: 24, marginBottom: 40 }}>
          <div style={styles.cardWrapper}>
            <span style={styles.bracketTopRight} />
            <div style={styles.aiCard}>
              <span style={styles.aiBadge}>💡 Dica da IA</span>
              <p style={styles.aiText}>
                Previsão de ocupação máxima para o Pátio Centro por volta das 14:00.
                Considere abrir vagas do Pátio Shopping para redirecionamento.
              </p>
            </div>
          </div>
        </section>
      </main>

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
  navLogo: {
    height: 60,
    objectFit: 'contain',
    mixBlendMode: 'screen',
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
  },
  userInfo: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
  },
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
  headerTitleArea: {
    color: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 800,
    margin: '0 0 6px',
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    margin: 0,
  },

  // Admin section
  adminSection: {
    width: '100%',
  },
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
  adminBarTitle: {
    color: '#fff',
    fontWeight: 700,
    fontSize: 14,
    marginRight: 8,
  },
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

  // Cards
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 20,
  },
  cardWrapper: {
    position: 'relative',
    width: '100%',
  },
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
  metricLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.75)',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 800,
    color: '#fff',
  },
  metricSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },

  // Pátios
  sectionContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#fff',
    margin: 0,
  },
  patiosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: 20,
  },
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
  patioHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  patioName: {
    fontSize: 16,
    fontWeight: 700,
    color: '#fff',
  },
  patioBadge: {
    fontSize: 12,
    fontWeight: 700,
    color: ORANGE,
    backgroundColor: 'rgba(249, 96, 0, 0.15)',
    padding: '4px 8px',
    borderRadius: 4,
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: ORANGE,
    transition: 'width 0.4s ease',
  },
  patioDetail: {
    margin: 0,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },

  // Tabelas
  tablesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
    gap: 20,
  },
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
  tableTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#fff',
    margin: 0,
  },
  tableResponsive: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  th: {
    padding: '10px 12px',
    fontSize: 12,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.6)',
    borderBottom: '1px solid rgba(255,255,255,0.15)',
    textTransform: 'uppercase',
  },
  tr: {
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  td: {
    padding: '12px',
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  tdBold: {
    padding: '12px',
    fontSize: 13,
    fontWeight: 700,
    color: '#fff',
  },

  // IA Card
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
  aiBadge: {
    fontSize: 12,
    fontWeight: 700,
    color: '#a3e635',
  },
  aiText: {
    margin: 0,
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 1.4,
  },


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