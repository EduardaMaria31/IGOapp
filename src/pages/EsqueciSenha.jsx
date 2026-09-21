import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import igoLogo from '../assets/logo-igo-10.png';
import bgEstacionamento from '../assets/estacionamento-bg.jpeg';

const NAVY = '#00167a';
const NAVY_DARK = '#000d47';
const ORANGE = '#f96000';

export default function EsqueciSenha() {
  const [email, setEmail] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [isErro, setIsErro] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function handleReset(e) {
    e.preventDefault();
    setMensagem('');
    setIsErro(false);
    setCarregando(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });

    setCarregando(false);

    if (error) {
      setIsErro(true);
      if (error.message.includes('rate limit')) {
        setMensagem(
          'Muitas tentativas em pouco tempo. Por favor, aguarde alguns minutos antes de tentar novamente.'
        );
      } else {
        setMensagem(error.message);
      }
    } else {
      setIsErro(false);
      setMensagem(
        'Se o e-mail estiver cadastrado, enviamos um link de recuperação.'
      );
    }
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
          <h1 style={styles.title}>Recuperar Senha</h1>
          <p style={styles.subtitle}>
            Informe seu e-mail cadastrado para receber as instruções de
            redefinição de senha.
          </p>
        </section>

        <section id="esqueci-form" style={styles.right}>
          <div style={styles.cardWrapper}>
            <span style={styles.bracketTopRight} />
            <span style={styles.bracketBottomLeft} />

            <form onSubmit={handleReset} style={styles.card}>
              <h2 style={styles.cardTitle}>Esqueci minha senha</h2>

              <div style={styles.field}>
                <label style={styles.label}>E-mail</label>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={styles.input}
                />
              </div>

              {mensagem && (
                <p
                  style={{
                    ...styles.mensagem,
                    color: isErro ? '#ffb4a2' : '#a3e635',
                  }}
                >
                  {mensagem}
                </p>
              )}

              <button type="submit" style={styles.button} disabled={carregando}>
                {carregando ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>

              <p style={styles.footerText}>
                Lembrou a senha?{' '}
                <Link to="/login" style={styles.smallLink}>
                  Voltar para o login
                </Link>
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
    padding: '32px 32px',
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
  mensagem: {
    fontSize: 13,
    lineHeight: 1.4,
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