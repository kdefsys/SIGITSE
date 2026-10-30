import React, { useState } from 'react';
import axios from 'axios';
import api from '../api/axios';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateRequestModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Crear la solicitud ITSE
      const response = await api.post('/itse', { title, description });
      const createdRequest = response.data;

      // 2. Adjuntar documento si fue seleccionado
      if (file && createdRequest.id) {
        const formData = new FormData();
        formData.append('file', file);

        await api.post(`/itse/${createdRequest.id}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message = axios.isAxiosError<{ message?: string | string[] }>(err)
        ? err.response?.data?.message
        : undefined;
      setError(
        Array.isArray(message)
          ? message.join(', ')
          : message || 'Error al crear la solicitud',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div className="card" style={{ width: '450px', background: '#fff' }}>
        <h3 style={{ marginBottom: '1rem' }}>📄 Nueva Solicitud ITSE</h3>
        {error && <p style={{ color: 'red', fontSize: '0.85rem' }}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Título del Establecimiento / Expediente</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Inspección Local Comercial A-102"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Descripción de la solicitud</label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe brevemente el establecimiento o trámite"
              style={{ ...inputStyle, minHeight: '90px', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Documento Inicial (PDF / Imagen)</label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={btnSecondaryStyle}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Guardando...' : 'Crear Solicitud'}
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
