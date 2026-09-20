import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Download, Eraser, FileSignature, LocateFixed, Printer, Save, ShieldCheck, Zap } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { addServiceOrderSignature } from '../services/serviceOrderService.js';
import { getCurrentPosition } from '../services/mobileInstallationService.js';
import { buildTechnicalReportData, finalizeInstallation, loadInstallationCompletion } from '../services/installationCompletionService.js';
import { getServiceOrderPhotoUrl } from '../services/serviceOrderMediaService.js';
import { listServiceOrderActivities } from '../services/serviceOrderActivityService.js';
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
  const [activities, setActivities] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [signer, setSigner] = useState({ name: '', document: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);

  const load = async () => {
    setBusy(true);
    try {
      const [data, activityRows] = await Promise.all([
        loadInstallationCompletion(id),
        listServiceOrderActivities(id).catch(() => []),
      ]);
      setOrder(data.order); setChecklist(data.checklist); setPhotos(data.photos); setSignatures(data.signatures); setActivities(activityRows);
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

  const imageUrlToJpegDataUrl = async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Falha ao carregar imagem do relatório.');
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    return {
      dataUrl: canvas.toDataURL('image/jpeg', 0.86),
      width: canvas.width,
      height: canvas.height,
    };
  };

  const generatePdf = async () => {
    setBusy(true);
    setMessage('Montando relatório com as fotos...');
    try {
      const report = buildTechnicalReportData(order, form, checklist, photos, signatures);
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageW = 210;
      const pageH = 297;
      const margin = 14;
      const contentW = pageW - margin * 2;
      const navy = [15, 44, 82];
      const gold = [226, 177, 22];
      const green = [29, 124, 73];
      const amber = [184, 120, 8];
      const red = [185, 48, 48];
      const soft = [246, 248, 251];
      const muted = [102, 116, 136];

      const safe = (v, fallback = '-') => (v == null || String(v).trim() === '' ? fallback : String(v));
      const ensureSpace = (needed = 20) => {
        if (y + needed > 280) {
          doc.addPage();
          y = 16;
        }
      };
      const text = (value, x, yy, size = 9, bold = false, color = [31, 41, 55], maxWidth = null) => {
        doc.setTextColor(...color);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(size);
        const lines = maxWidth ? doc.splitTextToSize(safe(value), maxWidth) : [safe(value)];
        doc.text(lines, x, yy);
        return lines.length * (size * 0.38 + 1.2);
      };
      const section = (title) => {
        ensureSpace(18);
        doc.setFillColor(...navy);
        doc.roundedRect(margin, y, contentW, 9, 2, 2, 'F');
        text(title, margin + 4, y + 6.1, 10, true, [255, 255, 255]);
        y += 13;
      };
      const pill = (label, x, yy, fill) => {
        doc.setFillColor(...fill);
        doc.roundedRect(x, yy, 27, 6.5, 3.2, 3.2, 'F');
        text(label, x + 13.5, yy + 4.4, 6.7, true, [255,255,255]);
      };

      let y = 0;

      // Capa / identificação
      doc.setFillColor(...navy);
      doc.rect(0, 0, pageW, 42, 'F');
      doc.setFillColor(...gold);
      doc.rect(0, 42, pageW, 2.2, 'F');
      text('MM ENERGIA SOLAR', margin, 14, 17, true, [255,255,255]);
      text('RELATÓRIO TÉCNICO DE SERVIÇO', margin, 23, 11, true, [235,241,248]);
      text(`OS #${safe(report.orderNumber)}`, margin, 32, 9, true, [255,255,255]);
      const statusText = order.status || 'Concluída';
      doc.setFillColor(...gold);
      doc.roundedRect(157, 11, 38, 10, 4, 4, 'F');
      text(statusText.toUpperCase(), 176, 17.5, 7.2, true, navy);

      y = 54;
      text('CLIENTE', margin, y, 7.5, true, muted);
      text(report.customerName, margin, y + 6, 12, true, navy);
      text(safe(report.customerPhone), margin, y + 12, 8.5, false, muted);
      text('ENDEREÇO DA INSTALAÇÃO', 108, y, 7.5, true, muted);
      text(report.address, 108, y + 6, 8.8, false, [31,41,55], 87);
      y += 24;

      // resumo executivo
      const nonCompliant = activities.filter((a) => a.condition === 'nao_conforme').length;
      const attention = activities.filter((a) => a.condition === 'atencao').length;
      const completedActivities = activities.filter((a) => a.status === 'concluido').length;
      const cards = [
        ['ATIVIDADES', String(activities.length || checklist.length)],
        ['CONFORMES', String(activities.filter((a) => a.condition === 'conforme').length)],
        ['ATENÇÕES', String(attention)],
        ['NÃO CONFORMES', String(nonCompliant)],
      ];
      cards.forEach((card, index) => {
        const x = margin + index * 45.5;
        doc.setFillColor(...soft);
        doc.roundedRect(x, y, 42, 20, 3, 3, 'F');
        text(card[0], x + 3, y + 6, 6.7, true, muted);
        text(card[1], x + 3, y + 15, 14, true, navy);
      });
      y += 28;

      section('Identificação do sistema');
      const info = [
        ['Tipo de serviço', order.serviceType],
        ['Equipe / técnico', order.assignedTeam || signatures[0]?.signer_name],
        ['Marca do inversor', form.inverter_brand],
        ['Modelo', form.inverter_model],
        ['Nº de série', form.inverter_serial],
        ['Monitoramento', form.monitoring_configured ? 'Configurado' : 'Não configurado'],
      ];
      info.forEach((item, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const x = margin + col * 92;
        const yy = y + row * 13;
        text(item[0].toUpperCase(), x, yy, 6.5, true, muted);
        text(safe(item[1]), x, yy + 5.5, 9, true, [31,41,55], 84);
      });
      y += 42;

      section('Testes elétricos');
      const tests = [
        ['Tensão da rede', `${safe(form.grid_voltage_v)} V`],
        ['Tensão do inversor', `${safe(form.inverter_voltage_v)} V`],
        ['Corrente do inversor', `${safe(form.inverter_current_a)} A`],
        ['Isolação', form.insulation_test_ok ? 'APROVADO' : 'NÃO APROVADO'],
        ['Aterramento', form.grounding_test_ok ? 'VERIFICADO' : 'PENDENTE'],
        ['Proteções', form.protection_test_ok ? 'TESTADAS' : 'PENDENTE'],
      ];
      tests.forEach((item, index) => {
        const col = index % 3;
        const row = Math.floor(index / 3);
        const x = margin + col * 61;
        const yy = y + row * 15;
        text(item[0], x, yy, 7, true, muted);
        text(item[1], x, yy + 5.5, 9, true, navy);
      });
      y += 34;

      // Atividades
      section('Atividades da manutenção');
      if (activities.length) {
        activities.forEach((activity, index) => {
          const obs = safe(activity.observation, 'Sem observação.');
          const obsLines = doc.splitTextToSize(obs, 108);
          const rowH = Math.max(14, 8 + obsLines.length * 4);
          ensureSpace(rowH + 3);
          if (index % 2 === 0) {
            doc.setFillColor(249,250,252);
            doc.rect(margin, y - 3, contentW, rowH, 'F');
          }
          text(activity.activity_type, margin + 2, y + 2, 8.2, true, navy, 43);
          const condition = activity.condition === 'nao_conforme' ? 'NÃO CONFORME' : activity.condition === 'atencao' ? 'ATENÇÃO' : 'CONFORME';
          const fill = activity.condition === 'nao_conforme' ? red : activity.condition === 'atencao' ? amber : green;
          pill(condition, margin + 48, y - 2.5, fill);
          text(obs, margin + 80, y + 2, 7.6, false, [55,65,81], 101);
          y += rowH;
        });
      } else {
        text('Nenhuma atividade técnica detalhada foi registrada.', margin, y, 8.5, false, muted);
        y += 10;
      }

      // não conformidades / recomendações
      if (attention || nonCompliant) {
        section('Não conformidades e prioridades');
        activities.filter((a) => a.condition !== 'conforme').forEach((activity) => {
          ensureSpace(16);
          const fill = activity.condition === 'nao_conforme' ? red : amber;
          doc.setFillColor(...fill);
          doc.roundedRect(margin, y - 3, 3.5, 12, 1, 1, 'F');
          text(activity.activity_type, margin + 7, y + 1, 8.5, true, navy);
          text(activity.observation || 'Requer avaliação técnica.', margin + 7, y + 6.5, 7.5, false, muted, 170);
          y += 15;
        });
      }

      if (form.delivery_notes) {
        section('Recomendações e observações técnicas');
        const h = text(form.delivery_notes, margin + 2, y, 8.5, false, [44,55,70], contentW - 4);
        y += h + 5;
      }

      // Fotos
      section('Registro fotográfico');
      text(`${photos.length} foto(s) registrada(s) na Ordem de Serviço`, margin, y, 8, false, muted);
      y += 8;

      const loadedPhotos = [];
      for (const photo of photos) {
        try {
          const signedUrl = await getServiceOrderPhotoUrl(photo.storage_path, 1800);
          const image = await imageUrlToJpegDataUrl(signedUrl);
          loadedPhotos.push({ ...photo, ...image });
        } catch (error) {
          console.warn('Foto ignorada no PDF', photo?.id, error);
        }
      }

      if (!loadedPhotos.length) {
        text('Não foi possível carregar as fotos para este PDF.', margin, y, 8.5, false, red);
        y += 10;
      } else {
        for (let i = 0; i < loadedPhotos.length; i += 2) {
          ensureSpace(76);
          const pair = loadedPhotos.slice(i, i + 2);
          for (let j = 0; j < pair.length; j++) {
            const photo = pair[j];
            const x = margin + j * 92;
            const boxW = 86;
            const boxH = 58;
            doc.setFillColor(247,248,250);
            doc.roundedRect(x, y, boxW, boxH + 12, 2.5, 2.5, 'F');
            const ratio = photo.width / photo.height;
            let drawW = boxW - 4;
            let drawH = drawW / ratio;
            if (drawH > boxH - 4) {
              drawH = boxH - 4;
              drawW = drawH * ratio;
            }
            const imageX = x + (boxW - drawW) / 2;
            const imageY = y + 2 + ((boxH - 4) - drawH) / 2;
            doc.addImage(photo.dataUrl, 'JPEG', imageX, imageY, drawW, drawH, undefined, 'FAST');
            text((photo.stage || 'Foto').toUpperCase(), x + 3, y + boxH + 5.5, 6.8, true, navy);
            if (photo.caption) text(photo.caption, x + 3, y + boxH + 10, 6.5, false, muted, 78);
          }
          y += 76;
        }
      }

      // Checklist resumido
      section('Checklist técnico');
      checklist.forEach((item) => {
        ensureSpace(9);
        const fill = item.completed ? green : amber;
        doc.setFillColor(...fill);
        doc.circle(margin + 2.5, y - 1, 1.6, 'F');
        text(`${item.section}: ${item.item}`, margin + 7, y + 1, 7.5, item.completed, [45,55,70], 171);
        y += 7;
      });
      y += 3;

      // Assinatura técnico
      section('Responsabilidade técnica');
      const lastSignature = signatures[0];
      if (lastSignature) {
        text('TÉCNICO RESPONSÁVEL', margin + 2, y, 6.8, true, muted);
        text(lastSignature.signer_name || '-', margin + 2, y + 6, 10, true, navy);
        if (lastSignature.signer_document) text(`Registro / documento: ${lastSignature.signer_document}`, margin + 2, y + 12, 7.5, false, muted);
        if (lastSignature.signature_data?.startsWith('data:image/')) {
          try {
            doc.addImage(lastSignature.signature_data, 'PNG', 118, y - 3, 68, 24);
            doc.setDrawColor(180,186,196);
            doc.line(118, y + 23, 186, y + 23);
          } catch {}
        }
        y += 29;
      } else {
        text('Assinatura do técnico não registrada.', margin + 2, y, 8.5, false, red);
        y += 10;
      }

      // Rodapé + paginação
      const pages = doc.getNumberOfPages();
      for (let page = 1; page <= pages; page++) {
        doc.setPage(page);
        doc.setDrawColor(224,228,234);
        doc.line(margin, 286, pageW - margin, 286);
        text('MM Energia Solar · Relatório gerado pelo MM ERP', margin, 291, 6.5, false, muted);
        text(`Página ${page} de ${pages}`, 176, 291, 6.5, false, muted);
      }

      doc.save(`MM-Energia-Solar-OS-${report.orderNumber || order.id.slice(0, 8)}.pdf`);
      setMessage(`PDF gerado com ${loadedPhotos.length} foto(s).`);
    } catch (error) {
      console.error(error);
      setMessage(error?.message || 'Não foi possível gerar o PDF.');
    } finally {
      setBusy(false);
    }
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