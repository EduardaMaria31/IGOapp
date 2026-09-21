import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import igoLogo from '../assets/logo-igo-10.png';
import bgEstacionamento from '../assets/estacionamento-bg.jpeg';

const NAVY = '#00167a';
const NAVY_DARK = '#000d47';
const ORANGE = '#f96000';

export default function RedefinirSenha() {
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);
  
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const navigate = useNavigate();

  async function handleRedefinir(e) {
    e.preventDefault();
    setErro('');

    if (novaSenha !== confirmarSenha) {
      setErro('As senhas informadas não coincidem.');
      return;
    }

    setCarregando(true);

    const { error } = await supabase.auth.updateUser({ password: novaSenha });

    setCarregando(false);

    if (error) {
      setErro(error.message || 'Erro ao redefinir a senha.');
      return;
    }

    setSucesso(true);
    setTimeout(() => navigate('/login'), 2500);
  }

  return (
    <div style={styles.page}>
      <div style={styles.bgOverlay} />

      <header style={styles.nav}>
        <div style={styles.navInner}>
          <img src={igoLogo} alt="iGO" style={styles.navLogo} />
        </div>
      </header>

      <main style={styles.content}>
        <section style={styles.left}>
          <h1 style={styles.title}>Redefinir Senha</h1>
          <p style={styles.subtitle}>
            Crie uma nova senha segura para acessar sua conta na plataforma iGO.
          </p>
        </section>

        <section id="redefinir-form" style={styles.right}>
          <div style={styles.cardWrapper}>
            <span style={styles.bracketTopRight} />
            <span style={styles.bracketBottomLeft} />

            <form onSubmit={handleRedefinir} style={styles.card}>
              <h2 style={styles.cardTitle}>Definir Senha</h2>

              {sucesso ? (
                <div style={styles.sucessoBox}>
                  <p style={styles.sucessoTexto}>
                    Senha alterada com sucesso! Redirecionando para a tela de login...
                  </p>
                  <button
                    type="button"
                    style={styles.button}
                    onClick={() => navigate('/login')}
                  >
                    Ir para o Login agora
                  </button>
                </div>
              ) : (
                <>
                  <div style={styles.field}>
                    <label style={styles.label}>Nova Senha</label>
                    <div style={styles.passwordWrap}>
                      <input
                        type={mostrarSenha ? 'text' : 'password'}
                        placeholder="Mínimo 6 caracteres"
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        required
                        minLength={6}
                        style={{ ...styles.input, paddingRight: 36 }}
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarSenha((v) => !v)}
                        style={styles.eyeButton}
                        aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                      >
                        {mostrarSenha ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.7 18.7 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.7 18.7 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}>Confirmar Nova Senha</label>
                    <div style={styles.passwordWrap}>
                      <input
                        type={mostrarConfirmarSenha ? 'text' : 'password'}
                        placeholder="Confirme a nova senha"
                        value={confirmarSenha}
                        onChange={(e) => setConfirmarSenha(e.target.value)}
                        required
                        minLength={6}
                        style={{ ...styles.input, paddingRight: 36 }}
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarConfirmarSenha((v) => !v)}
                        style={styles.eyeButton}
                        aria-label={mostrarConfirmarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                      >
                        {mostrarConfirmarSenha ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.7 18.7 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.7 18.7 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {erro && <p style={styles.erro}>{erro}</p>}

                  <button type="submit" style={styles.button} disabled={carregando}>
                    {carregando ? 'Salvando...' : 'Salvar nova senha'}
                  </button>

                  <p style={styles.footerText}>
                    Lembrou a senha anterior?{' '}
                    <Link to="/login" style={styles.smallLink}>
                      Voltar para o login
                    </Link>
                  </p>
                </>
              )}
            </form>
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
          height: 100vh;
          overflow-x: hidden;
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    height: '100vh',
    width: '100vw',
    position: 'relative',
    overflow: 'hidden',
    backgroundImage: `url(${bgEstacionamento})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  bgOverlay: {
    position: 'absolute',
    inset: 0,
    background: `linear-gradient(100deg, rgba(0,13,71,0.55) 0%, rgba(0,22,122,0.75) 45%, ${NAVY} 78%, ${NAVY_DARK} 100%)`,
    zIndex: 0,
  },
  nav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    padding: '24px 48px',
    pointerEvents: 'none',
  },
  navInner: {
    width: '100%',
    maxWidth: 1200,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
  },
  navLogo: {
    height: 100,
    objectFit: 'contain',
    mixBlendMode: 'screen',
    pointerEvents: 'auto',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 48,
    maxWidth: 1200,
    width: '90%',
    margin: '0 auto',
    padding: '0 24px',
    flexWrap: 'wrap',
  },
  left: {
    flex: '1 1 380px',
    maxWidth: 520,
    color: '#fff',
  },
  title: {
    fontSize: 44,
    fontWeight: 800,
    margin: '0 0 16px',
    lineHeight: 1.15,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 1.5,
    color: 'rgba(255,255,255,0.8)',
    margin: 0,
  },
  right: {
    flex: '1 1 380px',
    maxWidth: 440,
    display: 'flex',
    justifyContent: 'center',
  },
  cardWrapper: {
    position: 'relative',
    width: '100%',
    maxWidth: 440,
  },
  card: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    padding: '60px 38px',
    borderRadius: 4,
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.18)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#fff',
    margin: '0 0 4px',
    textAlign: 'left',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'left',
  },
  input: {
    padding: '10px 14px',
    borderRadius: 4,
    border: '1px solid rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    width: '100%',
  },
  passwordWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  },
  eyeButton: {
    position: 'absolute',
    right: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.75)',
    padding: 4,
  },
  erro: {
    color: '#ffb4a2',
    fontSize: 13,
    margin: 0,
    textAlign: 'left',
  },
  button: {
    padding: '13px',
    borderRadius: 4,
    border: 'none',
    backgroundColor: ORANGE,
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 4,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    margin: 0,
  },
  smallLink: {
    color: '#fff',
    fontWeight: 600,
    textDecoration: 'underline',
    fontSize: 13,
    whiteSpace: 'nowrap',
  },
  sucessoBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  sucessoTexto: {
    color: '#a3e635',
    fontSize: 14,
    lineHeight: 1.5,
    margin: 0,
    textAlign: 'left',
  },
  bracketTopRight: {
    position: 'absolute',
    top: -14,
    right: -14,
    width: 36,
    height: 36,
    borderTop: `3px solid ${ORANGE}`,
    borderRight: `3px solid ${ORANGE}`,
    pointerEvents: 'none',
  },
  bracketBottomLeft: {
    position: 'absolute',
    bottom: -14,
    left: -14,
    width: 36,
    height: 36,
    borderBottom: `3px solid ${ORANGE}`,
    borderLeft: `3px solid ${ORANGE}`,
    pointerEvents: 'none',
  },
};