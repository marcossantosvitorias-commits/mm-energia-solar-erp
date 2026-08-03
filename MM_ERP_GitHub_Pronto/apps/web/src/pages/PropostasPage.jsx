import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Copy, ExternalLink, FileDown, FileText, History, MessageCircle, Pencil, RefreshCw, RotateCcw, Save, Search, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import {
  confirmAcceptedProposalSale,
  deleteSalesProposal,
  listProposalVersions,
  listSalesProposals,
  rejectAcceptedProposalConfirmation,
  updateProposalStatus,
  updateSalesProposal,
} from '../services/proposalManagementService.js';
import { buildPublicProposalUrl } from '../services/publicProposalService.js';
import { canShareProposalPdf, downloadProposalPdf, generateProfessionalProposalPdf, whatsappUrl } from '../services/professionalProposalPdfService.js';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const statuses = ['Gerada', 'Enviada', 'Em negociação', 'Aceita', 'Venda Fechada', 'Recusada'];
const emptyEditor = null;
const digits = (value = '') => String(value).replace(/\D/g, '');

export default function PropostasPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [editor, setEditor] = useState(emptyEditor);
  const [versions, setVersions] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('Todos');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);
  const [sendingId, setSendingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setRows(await listSalesProposals()); }
    catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter((item) => {
    const text = `${item.client_name} ${item.phone} ${item.city || ''}`.toLowerCase();
    return text.includes(search.toLowerCase()) && (status === 'Todos' || item.status === status);
  }), [rows, search, status]);

  const summary = useMemo(() => ({
    total: rows.length,
    pipeline: rows.filter((item) => !['Venda Fechada', 'Recusada'].includes(item.status)).reduce((sum, item) => sum + Number(item.total_amount || 0), 0),
    pending: rows.filter((item) => item.status === 'Aceita' && item.sale_confirmation_status === 'Pendente').length,
    closed: rows.filter((item) => item.status === 'Venda Fechada').reduce((sum, item) => sum + Number(item.total_amount || 0), 0),
  }), [rows]);

  const openEditor = async (proposal) => {
    setEditor({ ...proposal });
    try { setVersions(await listProposalVersions(proposal.id)); }
    catch { setVersions([]); }
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const updated = await updateSalesProposal(editor.id, editor);
      setRows((current) => current.map((item) => item.id === updated.id ? updated : item));
      setEditor(updated);
      setVersions(await listProposalVersions(updated.id));
      setMessage('Proposta atualizada e nova versão registrada.');
    } catch (error) { setMessage(error.message); }
    finally { setSaving(false); }
  };

  const changeStatus = async (proposal, nextStatus) => {
    if (nextStatus === 'Venda Fechada') {
      setMessage('Use o botão Confirmar venda para gerar a Ordem de Serviço com segurança.');
      return;
    }
    try {
      const updated = await updateProposalStatus(proposal.id, nextStatus);
      setRows((current) => current.map((item) => item.id === updated.id ? updated : item));
      if (editor?.id === updated.id) setEditor(updated);
    } catch (error) { setMessage(error.message); }
  };

  const confirmSale = async (proposal) => {
    if (!window.confirm(`Confirmar a venda para ${proposal.client_name} e gerar a Ordem de Serviço?`)) return;
    const notes = window.prompt('Observação interna da confirmação (opcional):', '') || '';
    setConfirmingId(proposal.id);
    setMessage('Confirmando venda e gerando Ordem de Serviço...');
    try {
      const result = await confirmAcceptedProposalSale(proposal.id, notes);
      setRows((current) => current.map((item) => item.id === proposal.id ? result.proposal : item));
      setMessage(`Venda confirmada. Ordem de Serviço nº ${result.serviceOrder?.order_number || ''} criada com sucesso.`);
    } catch (error) { setMessage(error.message); }
    finally { setConfirmingId(null); }
  };

  const returnToNegotiation = async (proposal) => {
    const notes = window.prompt('Motivo para retornar a proposta à negociação:', '') || '';
    if (!notes.trim()) return;
    try {
      const updated = await rejectAcceptedProposalConfirmation(proposal.id, notes);
      setRows((current) => current.map((item) => item.id === updated.id ? updated : item));
      setMessage('Proposta devolvida para negociação sem gerar Ordem de Serviço.');
    } catch (error) { setMessage(error.message); }
  };

  const remove = async (proposal) => {
    if (!window.confirm(`Excluir a proposta de ${proposal.client_name}?`)) return;
    try { await deleteSalesProposal(proposal.id); setRows((current) => current.filter((item) => item.id !== proposal.id)); }
    catch (error) { setMessage(error.message); }
  };

  const publicUrl = (proposal) => proposal.public_token ? buildPublicProposalUrl(proposal.public_token) : '';
  const copyPublicLink = async (proposal) => {
    const url = publicUrl(proposal);
    if (!url) { setMessage('Aplique a migration de links públicos para gerar o link desta proposta.'); return; }
    try { await navigator.clipboard.writeText(url); setMessage(`Link público da proposta de ${proposal.client_name} copiado.`); }
    catch { window.prompt('Copie o link público da proposta:', url); }
  };

  const whatsapp = async (proposal) => {
    if (!digits(proposal.phone)) { setMessage('Informe o WhatsApp do cliente antes de enviar a proposta.'); return; }
    setSendingId(proposal.id); setMessage('Gerando o PDF completo para o WhatsApp Business...');
    try {
      const value = Math.max(0, Number(proposal.total_amount || 0) - Number(proposal.discount_amount || 0));
      const text = [`Olá, ${proposal.client_name}!`, 'Segue sua proposta personalizada da MM Energia Solar.', `Investimento: ${money.format(value)}.`].join('\n');
      const file = await generateProfessionalProposalPdf(proposal);
      if (canShareProposalPdf(file)) {
        await navigator.share({ title: file.name, text, files: [file] });
        setMessage('PDF completo anexado. Escolha o WhatsApp Business e depois o contato.');
        return;
      }
      downloadProposalPdf(file);
      window.location.assign(whatsappUrl(proposal.phone, `${text}\n\nO PDF completo foi baixado no aparelho. Anexe-o nesta conversa.`));
      setMessage('O PDF completo foi baixado. Anexe-o na conversa do WhatsApp Business que será aberta.');
    } catch (error) { setMessage(error?.name === 'AbortError' ? 'Compartilhamento cancelado.' : error.message || 'Não foi possível compartilhar o PDF.'); }
    finally { setSendingId(null); }
  };

  return <FinanceLayout title="Propostas comerciais" subtitle="Gerencie propostas, aceite do cliente, confirmação interna da venda e geração da Ordem de Serviço.">
    <section className="finance-panel">
      <div className="finance-kpi-grid"><Kpi label="Propostas" value={summary.total} /><Kpi label="Em negociação" value={money.format(summary.pipeline)} /><Kpi label="Aguardando confirmação" value={summary.pending} /><Kpi label="Vendas fechadas" value={money.format(summary.closed)} /></div>
      <div className="finance-toolbar" style={{ marginTop: 18 }}><label className="finance-search"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente, telefone ou cidade" /></label><select value={status} onChange={(e) => setStatus(e.target.value)}><option>Todos</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select><button className="finance-button secondary" onClick={load}><RefreshCw size={18} /> Atualizar</button></div>
      {message && <p className="finance-notice">{message}</p>}
      <div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>Cliente</th><th>Sistema</th><th>Valor</th><th>Status</th><th>Acesso público</th><th>Ações</th></tr></thead><tbody>{loading ? <tr><td colSpan="6">Carregando...</td></tr> : filtered.map((proposal) => <tr key={proposal.id}>
        <td><strong>{proposal.client_name}</strong><small>{proposal.phone} · {proposal.city || 'Cidade não informada'}</small>{proposal.sale_confirmation_status === 'Pendente' && <small style={{ color: '#b45309', fontWeight: 800 }}>Aceite recebido — confirmar venda</small>}</td>
        <td>{proposal.panel_count || 0} módulos · {proposal.system_power_kw || 0} kWp</td><td><strong>{money.format(proposal.total_amount || 0)}</strong></td>
        <td><select value={proposal.status} onChange={(e) => changeStatus(proposal, e.target.value)}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></td>
        <td><small>{proposal.public_view_count || 0} visualização(ões)</small>{proposal.public_viewed_at && <small>Última: {new Date(proposal.public_viewed_at).toLocaleString('pt-BR')}</small>}</td>
        <td><div className="finance-actions compact">{proposal.status === 'Aceita' && proposal.sale_confirmation_status === 'Pendente' && <><button title="Confirmar venda e gerar OS" disabled={confirmingId === proposal.id} onClick={() => confirmSale(proposal)}><CheckCircle2 size={17} /></button><button title="Retornar à negociação" onClick={() => returnToNegotiation(proposal)}><RotateCcw size={17} /></button></>}<button title="Gerar PDF" onClick={() => navigate(`/app/propostas/${proposal.id}/pdf`)}><FileDown size={17} /></button><button title="Copiar link público" onClick={() => copyPublicLink(proposal)}><Copy size={17} /></button>{proposal.public_token && <button title="Abrir link público" onClick={() => window.open(publicUrl(proposal), '_blank', 'noopener,noreferrer')}><ExternalLink size={17} /></button>}<button title="Editar" onClick={() => openEditor(proposal)}><Pencil size={17} /></button><button title="Enviar PDF no WhatsApp Business" disabled={sendingId === proposal.id} onClick={() => whatsapp(proposal)}><MessageCircle size={17} /></button><button title="Excluir" onClick={() => remove(proposal)}><Trash2 size={17} /></button></div></td>
      </tr>)}</tbody></table></div>
    </section>
    {editor && <div className="finance-modal-backdrop" onMouseDown={() => setEditor(null)}><div className="finance-modal" onMouseDown={(e) => e.stopPropagation()}><div className="finance-panel-header"><div><h2><FileText size={22} /> Editar proposta</h2><p>{editor.client_name}</p></div><button onClick={() => setEditor(null)}><X size={22} /></button></div><div className="finance-form">
      <Field label="Cliente" name="client_name" editor={editor} setEditor={setEditor} /><Field label="WhatsApp" name="phone" editor={editor} setEditor={setEditor} /><Field label="Cidade" name="city" editor={editor} setEditor={setEditor} /><Field label="Valor da proposta" name="total_amount" type="number" editor={editor} setEditor={setEditor} /><Field label="Desconto" name="discount_amount" type="number" editor={editor} setEditor={setEditor} /><Field label="Quantidade de módulos" name="panel_count" type="number" editor={editor} setEditor={setEditor} /><Field label="Potência do módulo (W)" name="panel_power_w" type="number" editor={editor} setEditor={setEditor} /><Field label="Potência do sistema (kWp)" name="system_power_kw" type="number" editor={editor} setEditor={setEditor} /><Field label="Geração mensal (kWh)" name="monthly_generation_kwh" type="number" editor={editor} setEditor={setEditor} /><Field label="Modelo dos módulos" name="panel_model" editor={editor} setEditor={setEditor} /><Field label="Modelo do inversor" name="inverter_model" editor={editor} setEditor={setEditor} /><Field label="Validade (dias)" name="validity_days" type="number" editor={editor} setEditor={setEditor} /><label className="finance-field"><span>Forma de pagamento</span><select value={editor.payment_method || ''} onChange={(e) => setEditor({ ...editor, payment_method: e.target.value })}><option value="">Não definida</option><option>PIX</option><option>Cartão</option><option>Financiamento</option></select></label><Field label="Parcelas" name="installment_count" type="number" editor={editor} setEditor={setEditor} /><Field label="Valor da parcela" name="installment_amount" type="number" editor={editor} setEditor={setEditor} /><label className="finance-field finance-field-wide"><span>Observações</span><textarea rows="4" value={editor.notes || ''} onChange={(e) => setEditor({ ...editor, notes: e.target.value })} /></label>
    </div><div className="finance-actions"><button className="finance-button" disabled={saving} onClick={save}><Save size={18} /> {saving ? 'Salvando...' : 'Salvar nova versão'}</button><button className="finance-button secondary" onClick={() => navigate(`/app/propostas/${editor.id}/pdf`)}><FileDown size={18} /> Visualizar PDF</button>{editor.public_token && <button className="finance-button secondary" onClick={() => copyPublicLink(editor)}><Copy size={18} /> Copiar link público</button>}{editor.status === 'Aceita' && editor.sale_confirmation_status === 'Pendente' && <button className="finance-button" onClick={() => confirmSale(editor)}><CheckCircle2 size={18} /> Confirmar venda e gerar OS</button>}</div><div style={{ marginTop: 22 }}><h3><History size={18} /> Histórico de versões</h3>{versions.length ? versions.map((version) => <div key={version.id} style={{ padding: 10, borderBottom: '1px solid #e2e8f0' }}><strong>Versão {version.version_number}</strong> · {new Date(version.created_at).toLocaleString('pt-BR')} · {money.format(version.snapshot?.total_amount || 0)}</div>) : <p>Nenhuma versão registrada.</p>}</div></div></div>}
  </FinanceLayout>;
}

function Field({ label, name, type = 'text', editor, setEditor }) { return <label className="finance-field"><span>{label}</span><input type={type} step={type === 'number' ? '0.01' : undefined} value={editor[name] ?? ''} onChange={(e) => setEditor({ ...editor, [name]: e.target.value })} /></label>; }
function Kpi({ label, value }) { return <div className="finance-kpi"><span>{label}</span><strong>{value}</strong></div>; }
