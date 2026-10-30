import React, { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Role } from '../types';
import type { AdminUser, ItseRequest, User } from '../types';

import { CreateRequestModal } from '../components/CreateRequestModal';
import { PaymentModal } from '../components/PaymentModal';
import { ReviewModal } from '../components/ReviewModal';
import { AssignInspectorModal } from '../components/AssignInspectorModal';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState<'requests' | 'users'>('requests');
  const [requests, setRequests] = useState<ItseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);

  // Estados para abrir modales
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(null);
  const [selectedAssignId, setSelectedAssignId] = useState<number | null>(null);

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

  useEffect(() => {
    let active = true;
    const loadRequests = async () => {
      try {
        const response = await api.get<ItseRequest[]>('/itse');
        if (active) setRequests(response.data);
      } catch (error) {
        if (active) console.error('Error al cargar solicitudes', error);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadRequests();
    return () => {
      active = false;
    };
  }, []);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    setUsersError('');
    try {
      const response = await api.get<AdminUser[]>('/admin/users');
      setUsers(response.data);
    } catch (error) {
      if (isAxiosError<{ message?: string | string[] }>(error)) {
        const message = error.response?.data?.message;
        setUsersError(
          Array.isArray(message)
            ? message.join('. ')
            : message ?? 'No se pudo cargar la lista de usuarios.',
        );
      } else {
        setUsersError('No se pudo cargar la lista de usuarios.');
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  const changeUserRole = async (target: AdminUser, role: User['role']) => {
    setUpdatingUserId(target.id);
    setUsersError('');
    try {
      const response = await api.patch<AdminUser>(`/admin/users/${target.id}/role`, { role });
      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser.id === target.id ? response.data : currentUser,
        ),
      );
    } catch (error) {
      setUsersError(
        isAxiosError<{ message?: string | string[] }>(error)
          ? Array.isArray(error.response?.data?.message)
            ? error.response.data.message.join('. ')
            : error.response?.data?.message ?? 'No se pudo actualizar el rol.'
          : 'No se pudo actualizar el rol.',
      );
    } finally {
      setUpdatingUserId(null);
    }
  };

  const openUsers = () => {
    setActiveView('users');
    void fetchUsers();
  };

  const roleLabels: Record<User['role'], string> = {
    [Role.ADMINISTRADO]: 'Administrado',
    [Role.INSPECTOR]: 'Inspector',
    [Role.ADMIN]: 'Administrador',
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
            <li>
              <button
                className={`sidebar-link${activeView === 'requests' ? ' sidebar-link-active' : ''}`}
                onClick={() => setActiveView('requests')}
              >
                <span aria-hidden="true">▤</span> Solicitudes ITSE
              </button>
            </li>
            {user?.role === Role.ADMIN && (
              <li>
                <button
                  className={`sidebar-link${activeView === 'users' ? ' sidebar-link-active' : ''}`}
                  onClick={openUsers}
                >
                  <span aria-hidden="true">♙</span> Gestión de usuarios
                </button>
              </li>
            )}
          </ul>
        </nav>

        <button onClick={logout} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '0.6rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
          Cerrar Sesión
        </button>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', color: '#0f172a' }}>
            {activeView === 'users' ? 'Gestión de usuarios' : 'Panel de Control'}
          </h1>
          <p style={{ color: '#64748b' }}>
            {activeView === 'users'
              ? 'Consulta las cuentas registradas y administra sus roles.'
              : 'Gestión Integrada de Inspecciones Técnicas de Seguridad en Edificaciones'}
          </p>
        </header>

        {activeView === 'users' && user?.role === Role.ADMIN ? (
          <section className="card users-card">
            <div className="users-card-heading">
              <div>
                <h2>Cuentas registradas</h2>
                <p>Los nuevos registros comienzan con el rol Administrado.</p>
              </div>
              <span className="users-count">{users.length} usuarios</span>
            </div>

            {usersError && <p className="users-error" role="alert">{usersError}</p>}

            {loadingUsers ? (
              <p className="users-empty">Cargando usuarios...</p>
            ) : users.length === 0 ? (
              <p className="users-empty">No hay usuarios registrados.</p>
            ) : (
              <div className="users-table-wrap">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Correo electrónico</th>
                      <th>Fecha de registro</th>
                      <th>Rol</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((registeredUser) => (
                      <tr key={registeredUser.id}>
                        <td>
                          <span className="user-avatar" aria-hidden="true">
                            {registeredUser.name.trim().charAt(0).toUpperCase()}
                          </span>
                          <strong>{registeredUser.name}</strong>
                          {registeredUser.id === user.id && <span className="you-label">Tú</span>}
                        </td>
                        <td>{registeredUser.email}</td>
                        <td>{new Date(registeredUser.createdAt).toLocaleDateString('es-PE')}</td>
                        <td>
                          <select
                            className="role-select"
                            aria-label={`Rol de ${registeredUser.name}`}
                            value={registeredUser.role}
                            disabled={
                              updatingUserId !== null ||
                              registeredUser.id === user.id
                            }
                            onChange={(event) => {
                              const selectedRole = Object.values(Role).find(
                                (role) => role === event.currentTarget.value,
                              );
                              if (selectedRole) void changeUserRole(registeredUser, selectedRole);
                            }}
                          >
                            {Object.values(Role).map((role) => (
                              <option key={role} value={role}>{roleLabels[role]}</option>
                            ))}
                          </select>
                          {updatingUserId === registeredUser.id && (
                            <span className="role-saving">Guardando...</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : (
          <>
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
          </>
        )}
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
