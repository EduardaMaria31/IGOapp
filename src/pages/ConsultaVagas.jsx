import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import MenuLateral from '../components/MenuLateral';
import igoLogo from '../assets/logo-igo-10.png';
import bgEstacionamento from '../assets/estacionamento-bg.jpeg';

const NAVY = '#00167a';
const NAVY_DARK = '#000d47';
const ORANGE = '#f96000';
const LIME = '#a3e635';

function tipoLabel(tv) {
  if (tv === 'moto') return 'Moto';
  if (tv === 'carro') return 'Carro';
  return tv || '—';
}

export default function ConsultaVagas() {
  const [patios, setPatios] = useState([]);
  const [vagas, setVagas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setCarregando(true);
    const { data: ps } = await supabase.from('patio').select('id, nome').order('nome');
    const { data: vs } = await supabase
      .from('vaga')
      .select('id, numero, tipo, status, patio_id')
      .order('numero');
    setPatios(ps ?? []);
    setVagas(vs ?? []);
    setCarregando(false);
  }

  // Vagas sem pátio associado caem em um grupo "Sem pátio"
  const grupos = patios.map((p) => ({
    ...p,
    vagas: vagas.filter((v) => v.patio_id === p.id),
  }));
  const semPatio = vagas.filter((v) => !patios.some((p) => p.id === v.patio_id));
  if (semPatio.length) grupos.push({ id: 'sem', nome: 'Sem pátio', vagas: semPatio });

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
          <h1 style={s.title}>Consulta de Vagas</h1>
          <p style={s.subtitle}>Status de todas as vagas, por pátio{carregando ? ' — carregando...' : ''}.</p>
        </div>

        {grupos.map((g) => {
          const livres = g.vagas.filter((v) => v.status === 'livre').length;
          const ocupadas = g.vagas.length - livres;
          return (
            <div key={g.id} style={s.cardWrapper}>
              <span style={s.bracketTopRight} />
              <div style={s.card}>
                <div style={s.patioHeader}>
                  <h2 style={s.sectionTitle}>{g.nome}</h2>
                  <div style={s.resumoVagas}>
                    <span style={{ ...s.badge, color: LIME, borderColor: 'rgba(163,230,53,0.4)', background: 'rgba(163,230,53,0.12)' }}>{livres} livres</span>
                    <span style={{ ...s.badge, color: ORANGE, borderColor: 'rgba(249,96,0,0.4)', background: 'rgba(249,96,0,0.12)' }}>{ocupadas} ocupadas</span>
                  </div>
                </div>
                <div style={s.vagasWrap}>
                  {g.vagas.map((v) => (
                    <span key={v.id} style={{
                      ...s.vagaTag,
                      background: v.status === 'livre' ? 'rgba(163,230,53,0.12)' : 'rgba(249,96,0,0.12)',
                      color: v.status === 'livre' ? LIME : ORANGE,
                      borderColor: v.status === 'livre' ? 'rgba(163,230,53,0.4)' : 'rgba(249,96,0,0.4)',
                    }} title={`${tipoLabel(v.tipo)} · ${v.status}`}>
                      {v.numero} · {v.status}
                    </span>
                  ))}
                  {g.vagas.length === 0 && <p style={s.hint}>Nenhuma vaga neste pátio.</p>}
                </div>
              </div>
            </div>
          );
        })}
        {!carregando && grupos.length === 0 && <p style={s.hint}>Nenhum pátio ou vaga cadastrada.</p>}
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
  patioHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 },
  resumoVagas: { display: 'flex', gap: 8 },
  badge: { padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: '1px solid' },
  vagasWrap: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  vagaTag: { padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: '1px solid' },
  hint: { fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 },
  bracketTopRight: { position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderTop: `3px solid ${ORANGE}`, borderRight: `3px solid ${ORANGE}`, pointerEvents: 'none', zIndex: 2 },
};
