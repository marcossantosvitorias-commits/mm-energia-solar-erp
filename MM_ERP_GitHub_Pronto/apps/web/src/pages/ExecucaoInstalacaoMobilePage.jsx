import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Camera, CheckCircle2, CloudOff, LocateFixed, MapPin, Play, RefreshCw, UploadCloud } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getCurrentPosition,
  getPendingFieldActions,
  isOnline,
  loadMobileInstallation,
  registerFieldEvent,
  saveChecklistOffline,
  saveFieldPhoto,
  syncPendingFieldActions,
} from '../services/mobileInstallationService.js';
import './execucao-instalacao-mobile.css';

export default function ExecucaoInstalacaoMobilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [online, setOnline] = useState(isOnline());
  const [pending, setPending] = useState(getPendingFieldActions().length);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('Antes');
  const [caption, setCaption] = useState('');
  const [preview, setPreview] = useState('');

  const load = async () => {
    setBusy(true);
    try {
      const data = await loadMobileInstallation(id);
      setOrder(data.order);
      setChecklist(data.checklist);
      setMessage(data.offline ? 'Dados carregados do aparelho. Você está trabalhando offline.' : 'OS pronta para execução em campo.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    const update = () => { setOnline(isOnline()); setPending(getPendingFieldActions().length); };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  const progress = useMemo(() => {
    if (!checklist.length) return 0;
    return Math.round((checklist.filter((item) => item.completed).length / checklist.length) * 100);
  }, [checklist]);

  const startInstallation = async () => {
    setBusy(true);
    try {
      const position = await getCurrentPosition();
      const result = await registerFieldEvent(id, 'check_in', { customer: order.customerName }, position);
      setOrder((current) => ({ ...current, status: 'Instalação iniciada', startedAt: current.startedAt || new Date().toISOString() }));
      setMessage(result.queued ? 'Início salvo no aparelho. Será sincronizado quando houver internet.' : 'Instalação iniciada com GPS registrado.');
      setPending(getPendingFieldActions().length);
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };

  const toggleChecklist = async (item) => {
    const completed = !item.completed;
    setChecklist((rows) => rows.map((row) => row.id === item.id ? { ...row, completed } : row));
    const result = await saveChecklistOffline(id, item, completed, item.notes);
    setMessage(result.queued ? 'Checklist salvo offline.' : 'Checklist atualizado.');
    setPending(getPendingFieldActions().length);
  };

  const capturePhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      let position = null;
      try { position = await getCurrentPosition(); } catch { position = null; }
      const result = await saveFieldPhoto(id, file, { stage, caption }, position);
      setPreview(result.previewUrl || URL.createObjectURL(file));
      setCaption('');
      setMessage(result.queued ? 'Foto salva no aparelho e aguardando sincronização.' : 'Foto enviada para a OS.');
      setPending(getPendingFieldActions().length);
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); event.target.value = ''; }
  };

  const sync = async () => {
    setBusy(true);
    try {
      const result = await syncPendingFieldActions();
      setPending(result.pending);
      setMessage(result.pending ? `${result.synced} registro(s) sincronizado(s); ${result.pending} pendente(s).` : `${result.synced} registro(s) sincronizado(s). Tudo atualizado.`);
      if (!result.pending) await load();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };

  const registerLocation = async () => {
    setBusy(true);
    try {
      const position = await getCurrentPosition();
      const result = await registerFieldEvent(id, 'location', { source: 'manual' }, position);
      setMessage(result.queued ? 'Localização salva offline.' : `Localização registrada com precisão aproximada de ${Math.round(position.accuracy)} m.`);
      setPending(getPendingFieldActions().length);
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };

  if (!order) return <main className="field-loading">{busy ? 'Carregando OS...' : message || 'OS não encontrada.'}</main>;

  return <main className="field-app">
    <header className="field-header">
      <button onClick={() => navigate('/app/ordens-servico')}><ArrowLeft size={20} /></button>
      <div><small>OS #{order.orderNumber}</small><strong>{order.customerName}</strong></div>
      <span className={online ? 'online' : 'offline'}>{online ? <UploadCloud size={16} /> : <CloudOff size={16} />}{online ? 'Online' : 'Offline'}</span>
    </header>

    {message && <div className="field-message">{message}</div>}

    <section className="field-card hero">
      <div><span>Status</span><strong>{order.status}</strong></div>
      <p><MapPin size={17} /> {order.installationAddress || 'Endereço não informado'} · {order.city}/{order.state}</p>
      <p>Equipe: <strong>{order.assignedTeam || 'Não definida'}</strong></p>
      <div className="field-actions">
        <button className="primary" disabled={busy || order.status === 'Instalação iniciada'} onClick={startInstallation}><Play size={19} /> Iniciar instalação com GPS</button>
        <button disabled={busy} onClick={registerLocation}><LocateFixed size={19} /> Registrar localização</button>
      </div>
    </section>

    <section className="field-card">
      <div className="field-section-title"><div><small>PROGRESSO</small><h2>Checklist em campo</h2></div><strong>{progress}%</strong></div>
      <div className="field-progress"><span style={{ width: `${progress}%` }} /></div>
      <div className="field-checklist">
        {checklist.map((item) => <button key={item.id} className={item.completed ? 'done' : ''} onClick={() => toggleChecklist(item)}>
          <span className="check-box">{item.completed && <CheckCircle2 size={22} />}</span>
          <span><small>{item.section}</small><strong>{item.item}</strong>{item.required && <em>Obrigatório</em>}</span>
        </button>)}
      </div>
    </section>

    <section className="field-card">
      <div className="field-section-title"><div><small>REGISTRO VISUAL</small><h2>Fotos da instalação</h2></div><Camera size={24} /></div>
      <div className="field-photo-form">
        <select value={stage} onChange={(e) => setStage(e.target.value)}><option>Antes</option><option>Durante</option><option>Depois</option><option>Ocorrência</option></select>
        <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Legenda da foto" />
        <label className="camera-button"><Camera size={21} /> Tirar foto<input type="file" accept="image/*" capture="environment" onChange={capturePhoto} /></label>
      </div>
      {preview && <img className="field-preview" src={preview} alt="Última foto capturada" />}
    </section>

    <section className="field-sync">
      <div><strong>{pending} pendência(s)</strong><span>{online ? 'Pronto para sincronizar' : 'Salvas neste aparelho'}</span></div>
      <button disabled={busy || !online || !pending} onClick={sync}><RefreshCw size={18} /> Sincronizar agora</button>
    </section>
  </main>;
}
