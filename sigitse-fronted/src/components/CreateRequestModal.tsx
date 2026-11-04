import React, { useState } from 'react';
import axios from 'axios';
import api from '../api/axios';
import type { ItseRequest } from '../types';

interface DraftFields {
  title: string;
  description: string;
  applicantName: string;
  applicantDocumentType: string;
  applicantDocumentNumber: string;
  applicantEmail: string;
  applicantPhone: string;
  establishmentAddress: string;
  establishmentDistrict: string;
}

interface Props {
  isOpen: boolean;
  draft: ItseRequest | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateRequestModal: React.FC<Props> = ({ isOpen, draft, onClose, onSuccess }) => {
  const [fields, setFields] = useState<DraftFields>(() => ({
    title: draft?.title ?? '',
    description: draft?.description ?? '',
    applicantName: draft?.applicantName ?? '',
    applicantDocumentType: draft?.applicantDocumentType ?? '',
    applicantDocumentNumber: draft?.applicantDocumentNumber ?? '',
    applicantEmail: draft?.applicantEmail ?? '',
    applicantPhone: draft?.applicantPhone ?? '',
    establishmentAddress: draft?.establishmentAddress ?? '',
    establishmentDistrict: draft?.establishmentDistrict ?? '',
  }));
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    let savedDraftId = draft?.id;
    let draftSaved = false;

    try {
      const data = fields;
      if (draft) {
        await api.patch(`/itse/${draft.id}/draft`, data);
        draftSaved = true;
      } else {
        const response = await api.post<ItseRequest>('/itse/drafts', data);
        savedDraftId = response.data.id;
        draftSaved = true;
      }

      if (file && savedDraftId) {
        const formData = new FormData();
        formData.append('file', file);

        await api.post(`/itse/${savedDraftId}/upload`, formData, {
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
        Array.isArray(message) ? message.join(', ') : message || 'Error al guardar el borrador',
      );
      if (draftSaved) onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div
        className="card"
        style={{ width: '520px', maxHeight: '90vh', overflowY: 'auto', background: '#fff' }}
      >
        <h3 style={{ marginBottom: '1rem' }}>
          {draft ? 'Editar borrador ITSE' : 'Nuevo borrador ITSE'}
        </h3>
        {error && <p style={{ color: 'red', fontSize: '0.85rem' }}>{error}</p>}
        <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
          Puedes guardar información incompleta. Antes de presentarla, completa los datos del
          solicitante y del establecimiento; en ese momento comenzará el plazo de 9 días hábiles.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Nombre del establecimiento</label>
            <input
              type="text"
              value={fields.title}
              onChange={(e) => setFields((current) => ({ ...current, title: e.target.value }))}
              placeholder="Ej: Inspección Local Comercial A-102"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Descripción de la solicitud</label>
            <textarea
              value={fields.description}
              onChange={(e) =>
                setFields((current) => ({ ...current, description: e.target.value }))
              }
              placeholder="Describe brevemente el establecimiento o trámite"
              style={{ ...inputStyle, minHeight: '90px', fontFamily: 'inherit' }}
            />
          </div>

          <h4>Datos del solicitante</h4>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Nombre completo</label>
            <input
              type="text"
              value={fields.applicantName}
              onChange={(e) =>
                setFields((current) => ({ ...current, applicantName: e.target.value }))
              }
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Tipo de documento</label>
              <input
                type="text"
                value={fields.applicantDocumentType}
                onChange={(e) =>
                  setFields((current) => ({
                    ...current,
                    applicantDocumentType: e.target.value,
                  }))
                }
                placeholder="DNI, RUC, CE..."
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Número de documento</label>
              <input
                type="text"
                value={fields.applicantDocumentNumber}
                onChange={(e) =>
                  setFields((current) => ({
                    ...current,
                    applicantDocumentNumber: e.target.value,
                  }))
                }
                style={inputStyle}
              />
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Correo electrónico</label>
            <input
              type="text"
              value={fields.applicantEmail}
              onChange={(e) =>
                setFields((current) => ({ ...current, applicantEmail: e.target.value }))
              }
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Teléfono</label>
            <input
              type="text"
              value={fields.applicantPhone}
              onChange={(e) =>
                setFields((current) => ({ ...current, applicantPhone: e.target.value }))
              }
              style={inputStyle}
            />
          </div>

          <h4>Datos del establecimiento</h4>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Dirección</label>
            <input
              type="text"
              value={fields.establishmentAddress}
              onChange={(e) =>
                setFields((current) => ({
                  ...current,
                  establishmentAddress: e.target.value,
                }))
              }
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Distrito</label>
            <input
              type="text"
              value={fields.establishmentDistrict}
              onChange={(e) =>
                setFields((current) => ({
                  ...current,
                  establishmentDistrict: e.target.value,
                }))
              }
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Adjuntar documento (PDF / Imagen)</label>
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
              {loading ? 'Guardando...' : 'Guardar borrador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: 600,
  marginBottom: '0.4rem',
};
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
};
const btnSecondaryStyle: React.CSSProperties = {
  padding: '0.6rem 1rem',
  background: '#e2e8f0',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
};
