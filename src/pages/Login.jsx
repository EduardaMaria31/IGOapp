import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import igoLogo from '../assets/logo-igo-10.png';
import bgEstacionamento from '../assets/estacionamento-bg.jpeg';

const NAVY = '#00167a';
const NAVY_DARK = '#000d47';
const ORANGE = '#f96000';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [lembrar, setLembrar] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    setCarregando(false);

    if (error) {
      setErro('E-mail ou senha inválidos.');
      return;
    }

    navigate('/dashboard');
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
          <h1 style={styles.title}>Sejam Bem-vindos!</h1>
          <p style={styles.subtitle}>
            Somos uma empresa de gerenciamento de estacionamento inteligente
            com o objetivo de simplificar processos e otimizar a mobilidade
            urbana.
          </p>
        </section>

        <section id="login-form" style={styles.right}>
          <div style={styles.cardWrapper}>
          <span style={styles.bracketTopRight} />
          <span style={styles.bracketBottomLeft} />
          <form onSubmit={handleLogin} style={styles.card}>
            <div style={styles.field}>
              <label style={styles.label}>E-mail ou Usuário</label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Senha</label>
              <div style={styles.passwordWrap}>
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  placeholder="Sua senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  style={{ ...styles.input, paddingRight: 40 }}
                />
                                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  style={styles.eyeButton}
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {mostrarSenha ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.7 18.7 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.7 18.7 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div style={styles.rowBetween}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={lembrar}
                  onChange={(e) => setLembrar(e.target.checked)}
                  style={styles.checkbox}
                />
                Lembrar de mim
              </label>
              <a href="/esqueci-senha" style={styles.smallLink}>Esqueci a senha</a>
            </div>

            {erro && <p style={styles.erro}>{erro}</p>}

            <button type="submit" style={styles.button} disabled={carregando}>
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>

            <p style={styles.footerText}>
              Ainda não tem conta?{' '}
              <Link to="/cadastro" style={styles.smallLink}>Criar uma conta</Link>
            </p>
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
          width: 100%;
          overflow-x: hidden;
        }
        @media (max-width: 900px) {
          .igo-login-content { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    width: '100%',
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
  },

  content: {
    position: 'relative',
    zIndex: 1,
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 48,
    maxWidth: 1200,
    width: '90%',
    margin: '0 auto',
    padding: '24px',
    flexWrap: 'wrap',
  },

  left: {
    flex: '1 1 420px',
    maxWidth: 590,
    color: '#fff',
  },
  title: {
    fontSize: 44,
    fontWeight: 800,
    margin: '0 0 16px',
    lineHeight: 1.15,
  },
  subtitle: {
    fontSize: 20,
    lineHeight: 1.6,
    color: 'rgba(255,255,255,0.8)',
    margin: '0 0 20px',
    maxWidth: 700,
  },
  right: {
    flex: '1 1 420px',
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
    gap: 18,
    padding: '36px 32px',
    borderRadius: 16,
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.18)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 15,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'left',
  },
  input: {
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
  },
  passwordWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
    eyeButton: {
    position: 'absolute',
    right: 120,
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.75)',
    padding: 0,
    width: 24,
    height: 24,
    zIndex: 2,
  },
  rowBetween: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 13,
    width: '100%',
    gap: 8,
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: 'rgba(255,255,255,0.8)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  checkbox: {
    accentColor: ORANGE,
    width: 15,
    height: 15,
  },
  smallLink: {
    color: '#fff',
    fontWeight: 600,
    textDecoration: 'underline',
    fontSize: 13,
    whiteSpace: 'nowrap',
  },
  erro: {
    color: '#ffb4a2',
    fontSize: 13,
    margin: 0,
  },
  button: {
    padding: '14px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: ORANGE,
    color: '#fff',
    fontSize: 16,
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