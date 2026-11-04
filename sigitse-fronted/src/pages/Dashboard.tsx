import React, { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { useAuth } from '../context/auth-context';
import api from '../api/axios';
import { Role } from '../types';
import type { AdminUser, ItseRequest, User } from '../types';

import { CreateRequestModal } from '../components/CreateRequestModal';
import { PaymentModal } from '../components/PaymentModal';
import { ReviewModal } from '../components/ReviewModal';
import { AssignInspectorModal } from '../components/AssignInspectorModal';
import { RequestDetailModal } from '../components/RequestDetailModal';

function formatDueDate(value: string) {
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(value.slice(0, 10) + 'T00:00:00.000Z'));
}

function isOverdue(value: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const today = `${parts.find((part) => part.type === 'year')?.value}-${parts.find((part) => part.type === 'month')?.value}-${parts.find((part) => part.type === 'day')?.value}`;
  return today > value.slice(0, 10);
}

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState<'requests' | 'drafts' | 'users'>(
    user?.role === Role.ADMIN ? 'users' : 'requests',
  );
  const [requests, setRequests] = useState<ItseRequest[]>([]);
  const [drafts, setDrafts] = useState<ItseRequest[]>([]);
  const [draftsError, setDraftsError] = useState('');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);

  // Estados para abrir modales
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<ItseRequest | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(null);
  const [selectedAssignId, setSelectedAssignId] = useState<number | null>(null);
  const [selectedDetailId, setSelectedDetailId] = useState<number | null>(null);

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

  const fetchDrafts = async () => {
    setDraftsError('');
    try {
      const response = await api.get<ItseRequest[]>('/itse/drafts');
      setDrafts(response.data);
    } catch (error) {
      const message = isAxiosError<{ message?: string | string[] }>(error)
        ? error.response?.data?.message
        : undefined;
      setDraftsError(
        Array.isArray(message)
          ? message.join('. ')
          : (message ?? 'No se pudieron cargar los borradores.'),
      );
    }
  };

  const refreshAdministradoData = async () => {
    await Promise.all([fetchRequests(), fetchDrafts()]);
  };

  useEffect(() => {
    let active = true;
    const loadRequests = async () => {
      try {
        if (user?.role === Role.ADMIN) {
          const response = await api.get<AdminUser[]>('/admin/users');
          if (active) setUsers(response.data);
        } else {
          const response = await api.get<ItseRequest[]>('/itse');
          if (active) setRequests(response.data);
          if (user?.role === Role.ADMINISTRADO) {
            const draftResponse = await api.get<ItseRequest[]>('/itse/drafts');
            if (active) setDrafts(draftResponse.data);
          }
        }
      } catch (error) {
        if (active) {
          if (user?.role === Role.ADMIN) setUsersError('No se pudo cargar la lista de usuarios.');
          else if (user?.role === Role.ADMINISTRADO) {
            setDraftsError('No se pudieron cargar los borradores.');
          } else console.error('Error al cargar solicitudes', error);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadRequests();
    return () => {
      active = false;
    };
  }, [user?.role]);

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
            : (message ?? 'No se pudo cargar la lista de usuarios.'),
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
            : (error.response?.data?.message ?? 'No se pudo actualizar el rol.')
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
    [Role.FUNCIONARIO]: 'Funcionario',
    [Role.ADMIN]: 'Administrador',
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <h2>SIGITSE Panel</h2>
        <div style={{ marginBottom: '2rem', fontSize: '0.85rem', color: '#94a3b8' }}>
          <p>
            <strong>Usuario:</strong> {user?.email}
          </p>
          <p>
            <strong>Rol:</strong> <span style={{ color: '#38bdf8' }}>{user?.role}</span>
          </p>
        </div>

        <nav style={{ flex: 1 }}>
          <ul style={{ listStyle: 'none' }}>
            {user?.role !== Role.ADMIN && user?.role !== Role.ADMINISTRADO && (
              <li>
                <button
                  className={`sidebar-link${activeView === 'requests' ? ' sidebar-link-active' : ''}`}
                  onClick={() => setActiveView('requests')}
                >
                  <span aria-hidden="true">▤</span> Solicitudes ITSE
                </button>
              </li>
            )}
            {user?.role === Role.ADMINISTRADO && (
              <>
                <li>
                  <button
                    className={`sidebar-link${activeView === 'requests' ? ' sidebar-link-active' : ''}`}
                    onClick={() => setActiveView('requests')}
                  >
                    <span aria-hidden="true">▤</span> Mis solicitudes
                  </button>
                </li>
                <li>
                  <button
                    className={`sidebar-link${activeView === 'drafts' ? ' sidebar-link-active' : ''}`}
                    onClick={() => setActiveView('drafts')}
                  >
                    <span aria-hidden="true">▧</span> Mis borradores
                  </button>
                </li>
              </>
            )}
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

        <button
          onClick={logout}
          style={{
            background: '#ef4444',
            color: '#fff',
            border: 'none',
            padding: '0.6rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Cerrar Sesión
        </button>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', color: '#0f172a' }}>
            {activeView === 'users'
              ? 'Gestión de usuarios'
              : activeView === 'drafts'
                ? 'Mis borradores'
                : 'Panel de Control'}
          </h1>
          <p style={{ color: '#64748b' }}>
            {activeView === 'users'
              ? 'Consulta las cuentas registradas y administra sus roles.'
              : activeView === 'drafts'
                ? 'Continúa editando tus solicitudes y preséntalas cuando estén listas.'
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

            {usersError && (
              <p className="users-error" role="alert">
                {usersError}
              </p>
            )}

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
                            disabled={updatingUserId !== null || registeredUser.id === user.id}
                            onChange={(event) => {
                              const selectedRole = Object.values(Role).find(
                                (role) => role === event.currentTarget.value,
                              );
                              if (selectedRole) void changeUserRole(registeredUser, selectedRole);
                            }}
                          >
                            {Object.values(Role).map((role) => (
                              <option key={role} value={role}>
                                {roleLabels[role]}
                              </option>
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
        ) : activeView === 'drafts' && user?.role === Role.ADMINISTRADO ? (
          <section className="card">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <div>
                <h3>Mis borradores</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  El plazo de 9 días hábiles comienza al presentar la solicitud.
                </p>
              </div>
              <button
                className="btn-primary"
                onClick={() => {
                  setSelectedDraft(null);
                  setIsCreateOpen(true);
                }}
              >
                + Nuevo borrador
              </button>
            </div>
            {draftsError && (
              <p role="alert" style={{ color: '#b91c1c' }}>
                {draftsError}
              </p>
            )}
            {loading ? (
              <p>Cargando borradores...</p>
            ) : drafts.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                No tienes borradores guardados.
              </p>
            ) : (
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'left',
                  fontSize: '0.9rem',
                }}
              >
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '0.75rem' }}>Expediente</th>
                    <th style={{ padding: '0.75rem' }}>Última edición</th>
                    <th style={{ padding: '0.75rem' }}>Documentos</th>
                    <th style={{ padding: '0.75rem' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((draft) => (
                    <tr key={draft.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.75rem' }}>
                        {draft.title.trim() || `Borrador #${draft.id}`}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {new Date(draft.updatedAt).toLocaleDateString('es-PE')}
                      </td>
                      <td style={{ padding: '0.75rem' }}>{draft.documents?.length ?? 0}</td>
                      <td style={{ padding: '0.75rem', display: 'flex', gap: '0.4rem' }}>
                        <button
                          className="request-detail-button"
                          onClick={() => setSelectedDetailId(draft.id)}
                        >
                          Ver
                        </button>
                        <button
                          className="request-detail-button"
                          onClick={() => {
                            setSelectedDraft(draft);
                            setIsCreateOpen(true);
                          }}
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ) : (
          <>
            {user?.role === Role.ADMINISTRADO && (
              <div
                className="card"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <h3>Mis Trámites ITSE</h3>
                  <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                    Registra una nueva solicitud y adjunta tus requisitos.
                  </p>
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
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  No hay solicitudes registradas aún.
                </p>
              ) : (
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                    fontSize: '0.9rem',
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '0.75rem' }}>ID</th>
                      <th style={{ padding: '0.75rem' }}>Expediente</th>
                      <th style={{ padding: '0.75rem' }}>Estado</th>
                      <th style={{ padding: '0.75rem' }}>Vencimiento</th>
                      <th style={{ padding: '0.75rem' }}>Documentos</th>
                      <th style={{ padding: '0.75rem' }}>Movimientos</th>
                      <th style={{ padding: '0.75rem' }}>Acciones Disponibles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((req) => (
                      <tr key={req.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.75rem' }}>#{req.id}</td>
                        <td style={{ padding: '0.75rem' }}>{req.title}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span
                            className={`badge badge-${req.status?.toLowerCase() || 'pendiente'}`}
                          >
                            {req.status || 'PENDIENTE'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {req.dueAt ? (
                            <>
                              {formatDueDate(req.dueAt)}
                              {isOverdue(req.dueAt) && (
                                <span className="deadline-list-alert">Vencido</span>
                              )}
                            </>
                          ) : (
                            'Sin fecha'
                          )}
                        </td>
                        <td style={{ padding: '0.75rem' }}>{req.documents?.length ?? 0}</td>
                        <td style={{ padding: '0.75rem' }}>{req.history?.length ?? 0}</td>
                        <td style={{ padding: '0.75rem', display: 'flex', gap: '0.4rem' }}>
                          <button
                            onClick={() => setSelectedDetailId(req.id)}
                            className="request-detail-button"
                          >
                            Ver detalle
                          </button>
                          {/* Acciones por rol */}
                          {user?.role === Role.ADMINISTRADO && (
                            <button
                              onClick={() => setSelectedPaymentId(req.id)}
                              style={{
                                background: '#10b981',
                                color: '#fff',
                                border: 'none',
                                padding: '0.4rem 0.8rem',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              Registrar Pago
                            </button>
                          )}

                          {user?.role === Role.FUNCIONARIO && (
                            <button
                              onClick={() => setSelectedReviewId(req.id)}
                              style={{
                                background: '#0284c7',
                                color: '#fff',
                                border: 'none',
                                padding: '0.4rem 0.8rem',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              Revisar documentos
                            </button>
                          )}

                          {user?.role === Role.FUNCIONARIO && (
                            <button
                              onClick={() => setSelectedAssignId(req.id)}
                              style={{
                                background: '#8b5cf6',
                                color: '#fff',
                                border: 'none',
                                padding: '0.4rem 0.8rem',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
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
      {isCreateOpen && (
        <CreateRequestModal
          key={selectedDraft?.id ?? 'new'}
          isOpen={isCreateOpen}
          draft={selectedDraft}
          onClose={() => {
            setIsCreateOpen(false);
            setSelectedDraft(null);
          }}
          onSuccess={refreshAdministradoData}
        />
      )}
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
      <RequestDetailModal
        key={selectedDetailId ?? 'closed'}
        requestId={selectedDetailId}
        onClose={() => setSelectedDetailId(null)}
      />
    </div>
  );
};
