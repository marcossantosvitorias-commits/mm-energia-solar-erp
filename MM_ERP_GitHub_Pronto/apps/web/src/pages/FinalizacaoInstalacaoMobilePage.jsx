import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Download, Eraser, FileSignature, LocateFixed, Printer, Save, ShieldCheck, Zap } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { addServiceOrderSignature } from '../services/serviceOrderService.js';
import { getCurrentPosition } from '../services/mobileInstallationService.js';
import { buildTechnicalReportData, finalizeInstallation, loadInstallationCompletion } from '../services/installationCompletionService.js';
import './finalizacao-instalacao-mobile.css';

const initialForm = {
  grid_voltage_v: '', inverter_voltage_v: '', inverter_current_a: '',
  insulation_test_ok: false, grounding_test_ok: false, protection_test_ok: false,
  inverter_brand: '', inverter_model: '', inverter_serial: '',
  monitoring_configured: false, monitoring_login: '', delivery_notes: '',
};

export default function FinalizacaoInstalacaoMobilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [order, setOrder] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [signer, setSigner] = useState({ name: '', document: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);

  const load = async () => {
    setBusy(true);
    try {
      const data = await loadInstallationCompletion(id);
      setOrder(data.order); setChecklist(data.checklist); setPhotos(data.photos); setSignatures(data.signatures);
      setCompleted(data.order.status === 'Concluída');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  useEffect(() => { load(); }, [id]);

  const pendingRequired = useMemo(() => checklist.filter((item) => item.required && !item.completed), [checklist]);
  const afterPhotos = useMemo(() => photos.filter((photo) => photo.stage === 'Depois'), [photos]);
  const ready = pendingRequired.length === 0 && afterPhotos.length > 0 && signatures.length > 0 && form.insulation_test_ok && form.grounding_test_ok && form.protection_test_ok;

  const point = (event) => {
    const canvas = canvasRef.current; const rect = canvas.getBoundingClientRect(); const source = event.touches?.[0] || event;
    return { x: (source.clientX - rect.left) * (canvas.width / rect.width), y: (source.clientY - rect.top) * (canvas.height / rect.height) };
  };
  const start = (event) => { event.preventDefault(); const ctx = canvasRef.current.getContext('2d'); const p = point(event); drawing.current = true; ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const draw = (event) => { if (!drawing.current) return; event.preventDefault(); const ctx = canvasRef.current.getContext('2d'); const p = point(event); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#111827'; ctx.lineTo(p.x, p.y); ctx.stroke(); };
  const stop = () => { drawing.current = false; };
  const clear = () => canvasRef.current?.getContext('2d').clearRect(0, 0, 900, 260);

  const saveSignature = async () => {
    if (!signer.name.trim()) return setMessage('Informe o nome do técnico responsável.');
    setBusy(true);
    try {
      await addServiceOrderSignature(id, {
        signerName: signer.name,
        signerDocument: signer.document,
        signatureData: canvasRef.current.toDataURL('image/png'),
        acceptanceText: 'Declaro, como técnico responsável, que os serviços, inspeções, testes e registros descritos neste relatório foram executados conforme informado.',
      });
      clear(); setSigner({ name: '', document: '' }); setMessage('Assinatura do técnico registrada.'); await load();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };

  const finish = async () => {
    if (!ready) return setMessage('Conclua o checklist obrigatório, registre foto depois, assinatura e aprove os três testes elétricos.');
    setBusy(true);
    try {
      const position = await getCurrentPosition();
      await finalizeInstallation(id, form, position);
      setCompleted(true);
      setMessage(`Instalação concluída com check-out GPS. Precisão aproximada: ${Math.round(position.accuracy)} m.`);
      await load();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };

  const generatePdf = () => {
    const report = buildTechnicalReportData(order, form, checklist, photos, signatures);
    const doc = new jsPDF();
    let y = 16;

    const addText = (text, size = 10, bold = false) => {
      doc.setFontSize(size);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(String(text || ''), 180);
      if (y + lines.length * 6 > 280) { doc.addPage(); y = 16; }
      doc.text(lines, 15, y);
      y += Math.max(6, lines.length * 5.5);
    };

    addText('MM Energia Solar', 16, true);
    addText('Relatório Técnico de Serviço', 14, true);
    addText(`OS #${report.orderNumber || '-'}`, 11, true);
    addText(`Cliente: ${report.customerName || '-'}`);
    addText(`Telefone: ${report.customerPhone || '-'}`);
    addText(`Endereço: ${report.address || '-'}`);
    addText(`Equipe: ${report.team || '-'}`);
    addText(`Conclusão: ${new Date().toLocaleString('pt-BR')}`);
    y += 3;

    addText('Testes elétricos', 12, true);
    addText(`Tensão da rede: ${form.grid_voltage_v || '-'} V`);
    addText(`Tensão do inversor: ${form.inverter_voltage_v || '-'} V`);
    addText(`Corrente do inversor: ${form.inverter_current_a || '-'} A`);
    addText(`Isolação: ${form.insulation_test_ok ? 'Aprovado' : 'Não aprovado'}`);
    addText(`Aterramento: ${form.grounding_test_ok ? 'Verificado' : 'Não verificado'}`);
    addText(`Proteções: ${form.protection_test_ok ? 'Testadas' : 'Não testadas'}`);
    y += 3;

    addText('Inversor e monitoramento', 12, true);
    addText(`Marca: ${form.inverter_brand || '-'}`);
    addText(`Modelo: ${form.inverter_model || '-'}`);
    addText(`Número de série: ${form.inverter_serial || '-'}`);
    addText(`Monitoramento: ${form.monitoring_configured ? 'Configurado' : 'Não configurado'}`);
    if (form.monitoring_login) addText(`Login/e-mail: ${form.monitoring_login}`);
    if (form.delivery_notes) addText(`Observações: ${form.delivery_notes}`);
    y += 3;

    addText('Checklist', 12, true);
    checklist.forEach((item) => addText(`${item.completed ? '✓' : '•'} ${item.section}: ${item.item}`));
    y += 3;

    addText(`Fotos registradas: ${photos.length}`, 11, true);
    const lastSignature = signatures[0];
    if (lastSignature) {
      addText(`Técnico responsável: ${lastSignature.signer_name || '-'}`, 11, true);
      if (lastSignature.signer_document) addText(`Documento: ${lastSignature.signer_document}`);
      if (lastSignature.signature_data?.startsWith('data:image/')) {
        if (y > 235) { doc.addPage(); y = 16; }
        try {
          doc.addImage(lastSignature.signature_data, 'PNG', 15, y + 3, 70, 24);
          y += 31;
        } catch { /* assinatura textual permanece no PDF */ }
      }
    }

    addText('Documento gerado pela MM Energia Solar a partir da Ordem de Serviço registrada no MM ERP.', 8);
    doc.save(`MM-Energia-Solar-OS-${report.orderNumber || order.id.slice(0, 8)}.pdf`);
  };

  const printReport = () => {
    buildTechnicalReportData(order, form, checklist, photos, signatures);
    window.print();
  };

  if (!order) return <main className="finish-loading">{busy ? 'Carregando finalização...' : message || 'OS não encontrada.'}</main>;

  return <main className="finish-app">
    <header className="finish-header no-print"><button onClick={() => navigate(`/app/ordens-servico/${id}/campo`)}><ArrowLeft size={20} /></button><div><small>FINALIZAÇÃO</small><strong>OS #{order.orderNumber}</strong></div><span>{completed ? 'Concluída' : 'Em execução'}</span></header>
    {message && <div className="finish-message no-print">{message}</div>}

    <section className="finish-report-head"><img src="/logo-mm.png" alt="MM Energia Solar" /><div><h1>Relatório técnico de entrega</h1><p>OS #{order.orderNumber} · {order.customerName}</p><small>{order.installationAddress} · {order.city}/{order.state}</small></div></section>

    <section className="finish-card"><div className="finish-title"><Zap size={22} /><div><small>ETAPA 1</small><h2>Testes elétricos</h2></div></div>
      <div className="finish-grid">
        <Field label="Tensão da rede (V)" value={form.grid_voltage_v} onChange={(v) => setForm({ ...form, grid_voltage_v: v })} />
        <Field label="Tensão do inversor (V)" value={form.inverter_voltage_v} onChange={(v) => setForm({ ...form, inverter_voltage_v: v })} />
        <Field label="Corrente do inversor (A)" value={form.inverter_current_a} onChange={(v) => setForm({ ...form, inverter_current_a: v })} />
      </div>
      <Check label="Teste de isolação aprovado" checked={form.insulation_test_ok} onChange={(v) => setForm({ ...form, insulation_test_ok: v })} />
      <Check label="Aterramento verificado" checked={form.grounding_test_ok} onChange={(v) => setForm({ ...form, grounding_test_ok: v })} />
      <Check label="Proteções elétricas testadas" checked={form.protection_test_ok} onChange={(v) => setForm({ ...form, protection_test_ok: v })} />
    </section>

    <section className="finish-card"><div className="finish-title"><ShieldCheck size={22} /><div><small>ETAPA 2</small><h2>Inversor e monitoramento</h2></div></div>
      <div className="finish-grid"><Field label="Marca" value={form.inverter_brand} onChange={(v) => setForm({ ...form, inverter_brand: v })} /><Field label="Modelo" value={form.inverter_model} onChange={(v) => setForm({ ...form, inverter_model: v })} /><Field label="Número de série" value={form.inverter_serial} onChange={(v) => setForm({ ...form, inverter_serial: v })} /></div>
      <Check label="Monitoramento configurado" checked={form.monitoring_configured} onChange={(v) => setForm({ ...form, monitoring_configured: v })} />
      <Field label="Login/e-mail do monitoramento" value={form.monitoring_login} onChange={(v) => setForm({ ...form, monitoring_login: v })} />
      <label>Observações da entrega<textarea rows="4" value={form.delivery_notes} onChange={(e) => setForm({ ...form, delivery_notes: e.target.value })} /></label>
    </section>

    <section className="finish-card no-print"><div className="finish-title"><FileSignature size={22} /><div><small>ETAPA 3</small><h2>Assinatura do técnico responsável</h2></div></div>
      <Field label="Nome do técnico" value={signer.name} onChange={(v) => setSigner({ ...signer, name: v })} />
      <Field label="Registro / documento (opcional)" value={signer.document} onChange={(v) => setSigner({ ...signer, document: v })} />
      <canvas ref={canvasRef} width="900" height="260" onMouseDown={start} onMouseMove={draw} onMouseUp={stop} onMouseLeave={stop} onTouchStart={start} onTouchMove={draw} onTouchEnd={stop} />
      <div className="finish-actions"><button onClick={clear}><Eraser size={18} /> Limpar</button><button className="primary" disabled={busy} onClick={saveSignature}><Save size={18} /> Salvar assinatura</button></div>
      <p>{signatures.length} assinatura(s) registrada(s).</p>
    </section>

    <section className="finish-card"><h2>Conferência final</h2><Status ok={pendingRequired.length === 0} text="Checklist obrigatório concluído" /><Status ok={afterPhotos.length > 0} text="Foto da instalação concluída registrada" /><Status ok={signatures.length > 0} text="Assinatura do técnico registrada" /><Status ok={form.insulation_test_ok && form.grounding_test_ok && form.protection_test_ok} text="Testes elétricos aprovados" /></section>

    <section className="finish-bottom no-print"><button disabled={busy || completed} onClick={finish}><LocateFixed size={19} /> {completed ? 'Instalação concluída' : 'Finalizar com check-out GPS'}</button><button disabled={!completed} onClick={generatePdf}><Download size={19} /> Gerar PDF para o cliente</button><button disabled={!completed} onClick={printReport}><Printer size={19} /> Imprimir relatório</button></section>
  </main>;
}

function Field({ label, value, onChange }) { return <label>{label}<input value={value} onChange={(e) => onChange(e.target.value)} /></label>; }
function Check({ label, checked, onChange }) { return <label className="finish-check"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /><span>{label}</span></label>; }
function Status({ ok, text }) { return <div className={`finish-status ${ok ? 'ok' : ''}`}><CheckCircle2 size={19} /><span>{text}</span></div>; }