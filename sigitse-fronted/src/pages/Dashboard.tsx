import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Role } from '../types';
import type { ItseRequest } from '../types';

import { CreateRequestModal } from '../components/CreateRequestModal';
import { PaymentModal } from '../components/PaymentModal';
import { ReviewModal } from '../components/ReviewModal';
import { AssignInspectorModal } from '../components/AssignInspectorModal';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [requests, setRequests] = useState<ItseRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para abrir modales
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(null);
  const [selectedAssignId, setSelectedAssignId] = useState<number | null>(null);

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
      {/* Sidebar */}
      <aside className="sidebar">
        <h2>SIGITSE Panel</h2>
        <div style={{ marginBottom: '2rem', fontSize: '0.85rem', color: '#94a3b8' }}>
          <p><strong>Usuario:</strong> {user?.email}</p>
          <p><strong>Rol:</strong> <span style={{ color: '#38bdf8' }}>{user?.role}</span></p>
        </div>

        <nav style={{ flex: 1 }}>
          <ul style={{ listStyle: 'none' }}>
            <li style={{ padding: '0.75rem 0', borderBottom: '1px solid #334155' }}>📋 Solicitudes ITSE</li>
          </ul>
        </nav>

        <button onClick={logout} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '0.6rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
          Cerrar Sesión
        </button>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', color: '#0f172a' }}>Panel de Control</h1>
          <p style={{ color: '#64748b' }}>Gestión Integrada de Inspecciones Técnicas de Seguridad en Edificaciones</p>
        </header>

        {user?.role === Role.ADMINISTRADO && (
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>Mis Trámites ITSE</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Registra una nueva solicitud y adjunta tus requisitos.</p>
            </div>
            <button className="btn-primary" onClick={() => setIsCreateOpen(true)}>
              + Nueva Solicitud
            </button>
          </div>
        )}

        {/* Tabla General */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Expedientes Registrados</h3>
          {loading ? (
            <p>Cargando datos...</p>
          ) : requests.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No hay solicitudes registradas aún.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '0.75rem' }}>ID</th>
                  <th style={{ padding: '0.75rem' }}>Expediente</th>
                  <th style={{ padding: '0.75rem' }}>Estado</th>
                  <th style={{ padding: '0.75rem' }}>Acciones Disponibles</th>
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
                    <td style={{ padding: '0.75rem', display: 'flex', gap: '0.4rem' }}>
                      {/* Acciones por rol */}
                      {user?.role === Role.ADMINISTRADO && (
                        <button
                          onClick={() => setSelectedPaymentId(req.id)}
                          style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Registrar Pago
                        </button>
                      )}

                      {(user?.role === Role.INSPECTOR || user?.role === Role.ADMIN) && (
                        <button
                          onClick={() => setSelectedReviewId(req.id)}
                          style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Evaluar
                        </button>
                      )}

                      {user?.role === Role.ADMIN && (
                        <button
                          onClick={() => setSelectedAssignId(req.id)}
                          style={{ background: '#8b5cf6', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Asignar Inspector
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Modales Interactivos */}
      <CreateRequestModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchRequests}
      />
      <PaymentModal
        requestId={selectedPaymentId}
        isOpen={!!selectedPaymentId}
        onClose={() => setSelectedPaymentId(null)}
        onSuccess={fetchRequests}
      />
      <ReviewModal
        requestId={selectedReviewId}
        isOpen={!!selectedReviewId}
        onClose={() => setSelectedReviewId(null)}
        onSuccess={fetchRequests}
      />
      <AssignInspectorModal
        requestId={selectedAssignId}
        isOpen={!!selectedAssignId}
        onClose={() => setSelectedAssignId(null)}
        onSuccess={fetchRequests}
      />
    </div>
  );
};
