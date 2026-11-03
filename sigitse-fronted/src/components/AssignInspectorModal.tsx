import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { errorMessage } from '../api/error-message';

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
  const [inspectors, setInspectors] = useState<Array<{ id: number; name: string }>>([]);
  const [loadingInspectors, setLoadingInspectors] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const load = async () => {
      setLoadingInspectors(true);
      setError('');
      setInspectorId('');
      try {
        const response = await api.get<Array<{ id: number; name: string }>>('/itse/inspectors');
        if (active) setInspectors(response.data);
      } catch (err: unknown) {
        if (active) setError(errorMessage(err, 'No se pudieron cargar los inspectores'));
      } finally {
        if (active) setLoadingInspectors(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [isOpen]);

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
    } catch (err: unknown) {
      setError(errorMessage(err, 'Error al asignar el inspector'));
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
            <label htmlFor="assigned-inspector" style={labelStyle}>Inspector</label>
            <select id="assigned-inspector" required value={inspectorId}
              onChange={(e) => setInspectorId(e.target.value)} style={inputStyle}
              disabled={loadingInspectors || loading}>
              <option value="">{loadingInspectors ? 'Cargando...' : 'Selecciona un inspector'}</option>
              {inspectors.map((inspector) => <option key={inspector.id} value={inspector.id}>{inspector.name}</option>)}
            </select>
            {!loadingInspectors && inspectors.length === 0 && <p>No hay inspectores registrados.</p>}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={btnSecondaryStyle}>
              Cancelar
            </button>
            <button type="submit" disabled={loading || loadingInspectors || !inspectorId} className="btn-primary">
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
