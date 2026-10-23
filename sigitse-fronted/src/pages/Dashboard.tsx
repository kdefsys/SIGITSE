import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Role } from '../types';
import type { ItseRequest } from '../types';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [requests, setRequests] = useState<ItseRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await api.get('/itse');
      setRequests(response.data);
    } catch (err) {
      console.error('Error al cargar solicitudes', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Barra Lateral / Sidebar */}
      <aside className="sidebar">
        <h2>SIGITSE Panel</h2>
        <div style={{ marginBottom: '2rem', fontSize: '0.85rem', color: '#94a3b8' }}>
          <p><strong>Usuario:</strong> {user?.email}</p>
          <p><strong>Rol:</strong> <span style={{ color: '#38bdf8' }}>{user?.role}</span></p>
        </div>

        <nav style={{ flex: 1 }}>
          <ul style={{ listStyle: 'none' }}>
            <li style={{ padding: '0.75rem 0', borderBottom: '1px solid #334155', cursor: 'pointer' }}>📋 Solicitudes ITSE</li>
            {user?.role === Role.ADMIN && (
              <li style={{ padding: '0.75rem 0', borderBottom: '1px solid #334155', cursor: 'pointer' }}>👥 Gestión de Inspectores</li>
            )}
          </ul>
        </nav>

        <button
          onClick={logout}
          style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '0.6rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
          Cerrar Sesión
        </button>
      </aside>

      {/* Contenido Principal */}
      <main className="main-content">
        <header style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', color: '#0f172a' }}>Panel de Control</h1>
            <p style={{ color: '#64748b' }}>Bienvenido al sistema integrado de gestión de seguridad.</p>
          </div>
        </header>

        {/* Sección específica por Rol */}
        {user?.role === Role.ADMINISTRADO && (
          <div className="card">
            <h3>Mis Trámites ITSE</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>Aquí puedes registrar nuevas solicitudes y adjuntar tus documentos y pagos.</p>
            <button className="btn-primary">+ Nueva Solicitud</button>
          </div>
        )}

        {user?.role === Role.INSPECTOR && (
          <div className="card">
            <h3>Inspecciones Asignadas</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>Listado de expedientes listos para revisión y emisión de dictamen.</p>
          </div>
        )}

        {user?.role === Role.ADMIN && (
          <div className="card">
            <h3>Panel de Administración General</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>Asignación de inspectores y supervisión de expedientes globales.</p>
          </div>
        )}

        {/* Tabla general de solicitudes */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Expedientes Registrados en el Sistema</h3>
          {loading ? (
            <p>Cargando datos...</p>
          ) : requests.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No hay solicitudes registradas aún.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '0.75rem' }}>ID</th>
                  <th style={{ padding: '0.75rem' }}>Título / Expediente</th>
                  <th style={{ padding: '0.75rem' }}>Estado</th>
                  <th style={{ padding: '0.75rem' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.75rem' }}>#{req.id}</td>
                    <td style={{ padding: '0.75rem' }}>{req.title}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className={`badge badge-${req.status?.toLowerCase() || 'pendiente'}`}>
                        {req.status || 'PENDIENTE'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <button style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer' }}>
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
};
