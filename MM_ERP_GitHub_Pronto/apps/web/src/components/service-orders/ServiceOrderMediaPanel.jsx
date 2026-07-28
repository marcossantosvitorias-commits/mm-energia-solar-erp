import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Eraser, FileSignature, Image as ImageIcon, Upload } from 'lucide-react';
import {
  addServiceOrderSignature,
  completeServiceOrder,
  listServiceOrderPhotos,
  listServiceOrderSignatures,
} from '../../services/serviceOrderService.js';
import { getServiceOrderPhotoUrl, uploadServiceOrderPhoto } from '../../services/serviceOrderMediaService.js';

const emptyPhoto = { stage: 'Durante', caption: '' };
const emptySignature = { signerName: '', signerDocument: '', acceptanceText: 'Declaro que o serviço foi executado e recebido conforme apresentado.' };

export default function ServiceOrderMediaPanel({ order, onCompleted, onMessage }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const [photos, setPhotos] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [photoForm, setPhotoForm] = useState(emptyPhoto);
  const [signatureForm, setSignatureForm] = useState(emptySignature);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!order?.id) return;
    try {
      const [photoRows, signatureRows] = await Promise.all([
        listServiceOrderPhotos(order.id),
        listServiceOrderSignatures(order.id),
      ]);
      const withUrls = await Promise.all(photoRows.map(async (photo) => ({
        ...photo,
        signedUrl: await getServiceOrderPhotoUrl(photo.storage_path),
      })));
      setPhotos(withUrls);
      setSignatures(signatureRows);
    } catch (error) {
      onMessage(error?.message || 'Não foi possível carregar fotos e assinaturas.');
    }
  };

  useEffect(() => { load(); }, [order?.id]);

  const pointerPosition = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const source = event.touches?.[0] || event;
    return {
      x: (source.clientX - rect.left) * (canvas.width / rect.width),
      y: (source.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (event) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const point = pointerPosition(event);
    drawingRef.current = true;
    context.beginPath();
    context.moveTo(point.x, point.y);
  };

  const draw = (event) => {
    if (!drawingRef.current) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const point = pointerPosition(event);
    context.lineWidth = 3;
    context.lineCap = 'round';
    context.strokeStyle = '#111827';
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const stopDrawing = () => { drawingRef.current = false; };
  const clearSignature = () => canvasRef.current?.getContext('2d').clearRect(0, 0, 900, 260);

  const sendPhoto = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await uploadServiceOrderPhoto(order.id, file, photoForm);
      setFile(null);
      setPhotoForm(emptyPhoto);
      onMessage('Foto adicionada à Ordem de Serviço.');
      await load();
    } catch (error) {
      onMessage(error?.message || 'Não foi possível enviar a foto.');
    } finally { setBusy(false); }
  };

  const saveSignature = async (event) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!signatureForm.signerName.trim()) return onMessage('Informe o nome de quem está assinando.');
    setBusy(true);
    try {
      await addServiceOrderSignature(order.id, {
        ...signatureForm,
        signatureData: canvas.toDataURL('image/png'),
      });
      clearSignature();
      setSignatureForm(emptySignature);
      onMessage('Assinatura salva com sucesso.');
      await load();
    } catch (error) {
      onMessage(error?.message || 'Não foi possível salvar a assinatura.');
    } finally { setBusy(false); }
  };

  const finishOrder = async () => {
    setBusy(true);
    try {
      const updated = await completeServiceOrder(order.id);
      onCompleted(updated);
      onMessage('Ordem de Serviço concluída com sucesso.');
    } catch (error) {
      onMessage(error?.message || 'Não foi possível concluir a OS.');
    } finally { setBusy(false); }
  };

  return (
    <div style={{ marginTop: 24 }}>
      <h3><Camera size={18} /> Fotos da instalação</h3>
      <form onSubmit={sendPhoto} className="finance-form-grid" style={{ marginBottom: 16 }}>
        <label>Etapa<select value={photoForm.stage} onChange={(e) => setPhotoForm({ ...photoForm, stage: e.target.value })}><option>Antes</option><option>Durante</option><option>Depois</option><option>Documento</option><option>Ocorrência</option></select></label>
        <label>Legenda<input value={photoForm.caption} onChange={(e) => setPhotoForm({ ...photoForm, caption: e.target.value })} placeholder="Ex.: módulos instalados" /></label>
        <label>Foto<input required type="file" accept="image/*,application/pdf" capture="environment" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label>
        <button type="submit" disabled={busy}><Upload size={17} /> Enviar foto</button>
      </form>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        {photos.map((photo) => <article key={photo.id} className="finance-card" style={{ padding: 10 }}>
          {photo.signedUrl ? <img src={photo.signedUrl} alt={photo.caption || photo.stage} style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 8 }} /> : <ImageIcon size={32} />}
          <strong>{photo.stage}</strong><small style={{ display: 'block' }}>{photo.caption || 'Sem legenda'}</small>
        </article>)}
        {!photos.length && <p>Nenhuma foto registrada.</p>}
      </div>

      <h3><FileSignature size={18} /> Assinatura do cliente</h3>
      <form onSubmit={saveSignature} className="finance-form-grid">
        <label>Nome completo<input required value={signatureForm.signerName} onChange={(e) => setSignatureForm({ ...signatureForm, signerName: e.target.value })} /></label>
        <label>CPF ou documento<input value={signatureForm.signerDocument} onChange={(e) => setSignatureForm({ ...signatureForm, signerDocument: e.target.value })} /></label>
        <label style={{ gridColumn: '1 / -1' }}>Termo de aceite<textarea rows="2" value={signatureForm.acceptanceText} onChange={(e) => setSignatureForm({ ...signatureForm, acceptanceText: e.target.value })} /></label>
        <div style={{ gridColumn: '1 / -1' }}>
          <canvas ref={canvasRef} width="900" height="260" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} style={{ width: '100%', maxWidth: 900, height: 180, border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff', touchAction: 'none' }} />
          <button type="button" onClick={clearSignature} style={{ marginTop: 8 }}><Eraser size={17} /> Limpar assinatura</button>
        </div>
        <button type="submit" disabled={busy}>Salvar assinatura</button>
      </form>

      <div style={{ marginTop: 14 }}>
        {signatures.map((signature) => <div key={signature.id} className="finance-card" style={{ marginBottom: 8 }}><CheckCircle2 size={17} /> Assinado por <strong>{signature.signer_name}</strong> em {new Date(signature.signed_at).toLocaleString('pt-BR')}</div>)}
      </div>

      <button type="button" onClick={finishOrder} disabled={busy || order.status === 'Concluída'} style={{ marginTop: 18 }}>
        <CheckCircle2 size={18} /> {order.status === 'Concluída' ? 'OS concluída' : 'Concluir Ordem de Serviço'}
      </button>
    </div>
  );
}
