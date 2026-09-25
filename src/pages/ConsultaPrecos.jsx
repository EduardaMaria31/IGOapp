import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import MenuLateral from '../components/MenuLateral';
import igoLogo from '../assets/logo-igo-10.png';
import bgEstacionamento from '../assets/estacionamento-bg.jpeg';

const NAVY = '#00167a';
const NAVY_DARK = '#000d47';
const ORANGE = '#f96000';

function tipoLabel(tv) {
  if (tv === 'moto') return 'Moto';
  if (tv === 'carro') return 'Carro';
  return tv || '—';
}
function brl(v) {
  return 'R$ ' + Number(v ?? 0).toFixed(2).replace('.', ',');
}

export default function ConsultaPrecos() {
  const [patios, setPatios] = useState([]);
  const [precos, setPrecos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setCarregando(true);
    const { data: ps } = await supabase.from('patio').select('id, nome').order('nome');
    const { data: tp } = await supabase
      .from('tabela_preco')
      .select('id, patio_id, tipo_veiculo, valor_hora, valor_fracao, tolerancia_minutos')
      .order('tipo_veiculo');
    setPatios(ps ?? []);
    setPrecos(tp ?? []);
    setCarregando(false);
  }

  const grupos = patios.map((p) => ({
    ...p,
    linhas: precos.filter((x) => x.patio_id === p.id),
  }));

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
          <h1 style={s.title}>Consulta de Preços</h1>
          <p style={s.subtitle}>Tabela de preços vigente, por pátio e tipo de veículo{carregando ? ' — carregando...' : ''}. Somente leitura.</p>
        </div>

        {grupos.map((g) => (
          <div key={g.id} style={s.cardWrapper}>
            <span style={s.bracketTopRight} />
            <div style={s.card}>
              <h2 style={s.sectionTitle}>{g.nome}</h2>
              <div style={s.tableResponsive}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Tipo</th>
                      <th style={s.th}>Valor por hora</th>
                      <th style={s.th}>Valor da fração</th>
                      <th style={s.th}>Tolerância</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.linhas.map((l) => (
                      <tr key={l.id} style={s.tr}>
                        <td style={s.tdBold}>{tipoLabel(l.tipo_veiculo)}</td>
                        <td style={s.td}>{brl(l.valor_hora)}</td>
                        <td style={s.td}>{brl(l.valor_fracao)}</td>
                        <td style={s.td}>{l.tolerancia_minutos} min</td>
                      </tr>
                    ))}
                    {g.linhas.length === 0 && (
                      <tr><td style={s.td} colSpan={4}>Nenhum preço cadastrado para este pátio.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
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
  cardWrapper: { position: 'relative', width: '100%' },
  card: { padding: 24, borderRadius: 4, background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.18)', boxShadow: '0 10px 25px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: 14 },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 },
  tableResponsive: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '10px 12px', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', borderBottom: '1px solid rgba(255,255,255,0.15)', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.08)' },
  td: { padding: '12px', fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  tdBold: { padding: '12px', fontSize: 13, fontWeight: 700, color: '#fff' },
  hint: { fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 },
  bracketTopRight: { position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderTop: `3px solid ${ORANGE}`, borderRight: `3px solid ${ORANGE}`, pointerEvents: 'none', zIndex: 2 },
};
