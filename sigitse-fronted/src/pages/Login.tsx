import React, { useState } from 'react';
import { isAxiosError } from 'axios';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import type { AuthResponse } from '../types';

type AuthMode = 'welcome' | 'login' | 'register';

const getErrorMessage = (error: unknown) => {
  if (isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join('. ');
    if (message) return message;
  }

  return 'No se pudo completar la solicitud. Verifica tu conexión e inténtalo nuevamente.';
};

export const Login: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('welcome');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const changeMode = (nextMode: AuthMode) => {
    setError('');
    setMode(nextMode);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (mode === 'register' && password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const response = mode === 'register'
        ? await api.post<AuthResponse>('/auth/register', { name, email, password })
        : await api.post<AuthResponse>('/auth/login', { email, password });

      login(response.data.token.access_token, response.data.user);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <header className="auth-header">
        <button className="brand-lockup" type="button" onClick={() => changeMode('welcome')} aria-label="Ir al inicio">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M5 26V12l11-7 11 7v14H5Z" />
              <path d="M11 26v-8h10v8M11 13h.01M16 13h.01M21 13h.01" />
            </svg>
          </span>
          <span className="brand-name">SIGITSE</span>
        </button>
        <span className="header-caption">Gestión de inspecciones de seguridad</span>
      </header>

      {mode === 'welcome' ? (
        <>
          <main className="welcome-layout">
            <section className="welcome-copy">
              <div className="eyebrow"><span /> Plataforma de gestión ITSE</div>
              <h1>Edificaciones seguras.<br /><span>Trámites más simples.</span></h1>
              <p className="welcome-description">
                Gestiona tus inspecciones técnicas de seguridad en un solo lugar.
                Registra solicitudes y consulta su avance de forma clara y sencilla.
              </p>
              <div className="welcome-actions">
                <button className="btn-primary welcome-primary" type="button" onClick={() => changeMode('login')}>
                  Iniciar sesión <span aria-hidden="true">→</span>
                </button>
                <button className="btn-secondary" type="button" onClick={() => changeMode('register')}>
                  Crear una cuenta
                </button>
              </div>
              <p className="welcome-note">¿Primera vez aquí? Regístrate para comenzar tu trámite.</p>
            </section>

            <aside className="welcome-visual" aria-label="Beneficios de SIGITSE">
              <div className="visual-orbit orbit-one" />
              <div className="visual-orbit orbit-two" />
              <div className="visual-card">
                <div className="visual-card-top">
                  <span className="visual-icon" aria-hidden="true">
                    <svg viewBox="0 0 32 32" fill="none">
                      <path d="M16 4 26 8v7c0 6-4.3 10.5-10 13-5.7-2.5-10-7-10-13V8l10-4Z" />
                      <path d="m11.5 16 3 3 6-6" />
                    </svg>
                  </span>
                  <span className="visual-status"><span /> Plataforma segura</span>
                </div>
                <h2>Tu seguridad,<br />en cada paso.</h2>
                <p>Un proceso ordenado para dar seguimiento a tus inspecciones técnicas.</p>
                <div className="visual-divider" />
                <div className="visual-feature">
                  <span className="feature-check" aria-hidden="true">✓</span>
                  <span><strong>Solicitudes centralizadas</strong><small>Todo tu proceso en un solo espacio</small></span>
                </div>
                <div className="visual-feature">
                  <span className="feature-check" aria-hidden="true">✓</span>
                  <span><strong>Seguimiento transparente</strong><small>Consulta el estado de tus trámites</small></span>
                </div>
              </div>
              <div className="visual-decoration decoration-top" />
              <div className="visual-decoration decoration-bottom" />
            </aside>
          </main>
          <footer className="auth-footer">
            Sistema de Inspecciones Técnicas de Seguridad en Edificaciones
          </footer>
        </>
      ) : (
        <main className="auth-form-layout">
          <section className="auth-form-intro">
            <button className="back-link" type="button" onClick={() => changeMode('welcome')}>
              <span aria-hidden="true">←</span> Volver al inicio
            </button>
            <div className="eyebrow"><span /> SIGITSE</div>
            <h1>{mode === 'register' ? <>Crea tu cuenta<br /><span>y empieza hoy.</span></> : <>Qué bueno<br /><span>tenerte de vuelta.</span></>}</h1>
            <p>
              {mode === 'register'
                ? 'Regístrate para gestionar tus solicitudes de inspección de manera fácil y segura.'
                : 'Ingresa a tu cuenta para continuar con la gestión de tus inspecciones.'}
            </p>
          </section>

          <section className="auth-form-card">
            <div className="form-heading">
              <h2>{mode === 'register' ? 'Crear cuenta' : 'Iniciar sesión'}</h2>
              <p>{mode === 'register' ? 'Completa tus datos para registrarte.' : 'Ingresa tus credenciales para continuar.'}</p>
            </div>

            {error && <div className="auth-error" role="alert">{error}</div>}

            <form onSubmit={handleSubmit}>
              {mode === 'register' && (
                <div className="form-field">
                  <label htmlFor="register-name">Nombre completo</label>
                  <input
                    id="register-name"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    required
                    placeholder="Tu nombre y apellido"
                  />
                </div>
              )}
              <div className="form-field">
                <label htmlFor="auth-email">Correo electrónico</label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                  placeholder="usuario@correo.com"
                />
              </div>
              <div className="form-field">
                <label htmlFor="auth-password">Contraseña</label>
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  minLength={mode === 'register' ? 6 : undefined}
                  required
                  placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : 'Ingresa tu contraseña'}
                />
              </div>
              {mode === 'register' && (
                <div className="form-field">
                  <label htmlFor="confirm-password">Confirmar contraseña</label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                    placeholder="Repite tu contraseña"
                  />
                </div>
              )}
              <button className="btn-primary auth-submit" type="submit" disabled={loading}>
                {loading
                  ? 'Procesando...'
                  : mode === 'register' ? 'Crear cuenta' : 'Iniciar sesión'}
              </button>
            </form>

            <p className="auth-switch">
              {mode === 'register' ? '¿Ya tienes una cuenta?' : '¿Aún no tienes una cuenta?'}{' '}
              <button
                type="button"
                onClick={() => changeMode(mode === 'register' ? 'login' : 'register')}
              >
                {mode === 'register' ? 'Inicia sesión' : 'Regístrate'}
              </button>
            </p>
          </section>
        </main>
      )}
    </div>
  );
};
