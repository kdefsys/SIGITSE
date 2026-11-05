import React, { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import api from '../api/axios';
import type { ItseRequest } from '../types';

interface Props {
  requestId: number | null;
  onClose: () => void;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value));
}

function limaToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function readableAction(action: string) {
  return action
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
}

export const RequestDetailModal: React.FC<Props> = ({ requestId, onClose }) => {
  const [request, setRequest] = useState<ItseRequest | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    if (requestId === null) return;
    let active = true;
    api
      .get<ItseRequest>(`/itse/${requestId}`)
      .then(({ data }) => {
        if (active) setRequest(data);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        const message = isAxiosError<{ message?: string | string[] }>(cause)
          ? cause.response?.data?.message
          : undefined;
        setError(
          Array.isArray(message)
            ? message.join('. ')
            : (message ?? 'No se pudo cargar el detalle del expediente.'),
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [requestId]);

  if (requestId === null) return null;

  const downloadDocument = async (documentId: number, filename: string) => {
    setDownloadingId(documentId);
    setError('');
    try {
      const { data } = await api.get<Blob>(`/itse/${requestId}/documents/${documentId}/download`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause: unknown) {
      const message = isAxiosError<{ message?: string | string[] }>(cause)
        ? cause.response?.data?.message
        : undefined;
      setError(
        Array.isArray(message)
          ? message.join('. ')
          : (message ?? 'No se pudo descargar el documento.'),
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const overdue =
    request !== null && request.dueAt !== null && limaToday() > request.dueAt.slice(0, 10);

  return (
    <div className="request-detail-overlay" role="presentation">
      <section
        className="request-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-detail-title"
      >
        <header className="request-detail-header">
          <div>
            <p className="request-detail-eyebrow">Expediente ITSE #{requestId}</p>
            <h2 id="request-detail-title">{request?.title ?? 'Detalle del expediente'}</h2>
          </div>
          <button
            type="button"
            className="request-detail-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>

        {error && (
          <p className="request-detail-error" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <p className="request-detail-message">Cargando expediente...</p>
        ) : request ? (
          <div className="request-detail-content">
            {overdue && (
              <p className="deadline-alert" role="status">
                El plazo venció. El expediente permanece abierto y requiere seguimiento.
              </p>
            )}
            <section className="request-detail-section">
              <h3>Estado y plazo</h3>
              <dl className="request-detail-grid">
                <div>
                  <dt>Estado actual</dt>
                  <dd>{request.status}</dd>
                </div>
                <div>
                  <dt>Fecha de inicio</dt>
                  <dd>{request.startedAt ? formatDate(request.startedAt) : 'Aún no presentada'}</dd>
                </div>
                <div>
                  <dt>Vencimiento</dt>
                  <dd>{request.dueAt ? formatDate(request.dueAt) : 'Se calcula al presentar'}</dd>
                </div>
                <div>
                  <dt>Solicitante</dt>
                  <dd>{request.user?.name ?? 'No disponible'}</dd>
                </div>
                <div>
                  <dt>Inspector</dt>
                  <dd>{request.inspector?.name ?? 'Sin asignar'}</dd>
                </div>
                <div>
                  <dt>Solicitante</dt>
                  <dd>{request.applicantName ?? 'No registrado'}</dd>
                </div>
                <div>
                  <dt>Documento</dt>
                  <dd>
                    {request.applicantDocumentType && request.applicantDocumentNumber
                      ? `${request.applicantDocumentType} ${request.applicantDocumentNumber}`
                      : 'No registrado'}
                  </dd>
                </div>
                <div>
                  <dt>Correo del solicitante</dt>
                  <dd>{request.applicantEmail ?? 'No registrado'}</dd>
                </div>
                <div>
                  <dt>Teléfono</dt>
                  <dd>{request.applicantPhone ?? 'No registrado'}</dd>
                </div>
                <div>
                  <dt>Razón social o titular</dt>
                  <dd>{request.establishmentBusinessName || 'No registrado'}</dd>
                </div>
                <div>
                  <dt>RUC</dt>
                  <dd>{request.establishmentRuc || 'No registrado'}</dd>
                </div>
                <div>
                  <dt>Dirección del establecimiento</dt>
                  <dd>{request.establishmentAddress ?? 'No registrada'}</dd>
                </div>
                <div>
                  <dt>Distrito</dt>
                  <dd>{request.establishmentDistrict ?? 'No registrado'}</dd>
                </div>
                {request.description && (
                  <div className="request-detail-description">
                    <dt>Descripción</dt>
                    <dd>{request.description}</dd>
                  </div>
                )}
              </dl>
            </section>

            <section className="request-detail-section">
              <h3>Documentos ({request.documents?.length ?? 0})</h3>
              {request.documents?.length ? (
                <ul className="request-document-list">
                  {request.documents.map((item) => (
                    <li key={item.id}>
                      <div>
                        <strong>{item.originalName}</strong>
                        <span>
                          {formatDate(item.createdAt)} · {(item.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={downloadingId !== null}
                        onClick={() => void downloadDocument(item.id, item.originalName)}
                      >
                        {downloadingId === item.id ? 'Descargando...' : 'Descargar'}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="request-detail-message">No hay documentos adjuntos.</p>
              )}
            </section>

            <section className="request-detail-section">
              <h3>Historial ({request.history?.length ?? 0})</h3>
              {request.history?.length ? (
                <ol className="request-history-list">
                  {request.history.map((entry) => (
                    <li key={entry.id}>
                      <span className="request-history-dot" aria-hidden="true" />
                      <div>
                        <strong>{readableAction(entry.action)}</strong>
                        <p>{entry.description}</p>
                        <span>
                          {new Intl.DateTimeFormat('es-PE', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                            timeZone: 'America/Lima',
                          }).format(new Date(entry.createdAt))}
                          {entry.actor?.name ? ` · ${entry.actor.name}` : ''}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="request-detail-message">No hay movimientos registrados.</p>
              )}
            </section>
          </div>
        ) : null}
        <footer className="request-detail-footer">
          <button type="button" onClick={onClose}>
            Cerrar
          </button>
        </footer>
      </section>
    </div>
  );
};
