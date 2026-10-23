import React, { useState } from 'react';
import api from '../api/axios';

interface Props {
  requestId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AssignInspectorModal: React.FC<Props> = ({ requestId, isOpen, onClose, onSuccess }) => {
  const [inspectorId, setInspectorId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !requestId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.patch(`/itse/${requestId}/assign-inspector`, {
        inspectorId: parseInt(inspectorId, 10),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al asignar el inspector');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div className="card" style={{ width: '400px', background: '#fff' }}>
        <h3 style={{ marginBottom: '1rem' }}>👨‍🚒 Asignar Inspector a Expediente #{requestId}</h3>
        {error && <p style={{ color: 'red', fontSize: '0.85rem' }}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>ID del Inspector</label>
            <input
              type="number"
              required
              value={inspectorId}
              onChange={(e) => setInspectorId(e.target.value)}
              placeholder="Ej: 2"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={btnSecondaryStyle}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Asignando...' : 'Confirmar Asignación'}
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
