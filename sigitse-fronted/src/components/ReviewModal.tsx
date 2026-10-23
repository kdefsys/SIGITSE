import React, { useState } from 'react';
import api from '../api/axios';
import { RequestStatus } from '../types';

interface Props {
  requestId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReviewModal: React.FC<Props> = ({ requestId, isOpen, onClose, onSuccess }) => {
  const [action, setAction] = useState<string>(RequestStatus.APROBADO);
  const [observation, setObservation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !requestId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.patch(`/itse/${requestId}/review`, {
        action,
        observation: action !== RequestStatus.APROBADO ? observation : undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al emitir dictamen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div className="card" style={{ width: '420px', background: '#fff' }}>
        <h3 style={{ marginBottom: '1rem' }}>🔍 Evaluar Expediente #{requestId}</h3>
        {error && <p style={{ color: 'red', fontSize: '0.85rem' }}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Dictamen de la Revisión</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              style={inputStyle}
            >
              <option value={RequestStatus.APROBADO}>APROBAR</option>
              <option value={RequestStatus.OBSERVADO}>OBSERVAR</option>
              <option value={RequestStatus.RECHAZADO}>RECHAZAR</option>
            </select>
          </div>

          {action !== RequestStatus.APROBADO && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Observaciones Técnicas</label>
              <textarea
                required
                rows={3}
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Indique los motivos de la observación o rechazo..."
                style={{ ...inputStyle, fontFamily: 'inherit' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={btnSecondaryStyle}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Guardando...' : 'Emitir Dictamen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
};
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' };
const btnSecondaryStyle: React.CSSProperties = { padding: '0.6rem 1rem', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer' };
