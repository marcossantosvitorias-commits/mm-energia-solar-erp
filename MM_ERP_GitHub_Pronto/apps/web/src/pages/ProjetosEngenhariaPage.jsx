import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, ClipboardList, FilePlus2, FolderKanban, MapPin, Plus, Search, Send, UserRound, X } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import { listClients } from '../services/clientService.js';
import {
  addProjectActivity, addProjectDocument, addProjectTask, createEngineeringProject,
  listEngineeringProjects, listProjectActivities, listProjectDocuments, listProjectTasks,
  updateEngineeringProject, updateProjectDocument, updateProjectTask,
} from '../services/engineeringProjectService.js';
import './ProjetosEngenhariaPage.css';

const statuses = ['Cadastro', 'Em análise', 'Aguardando documentos', 'Em projeto', 'Protocolado', 'Em exigência', 'Aprovado', 'Homologado', 'Cancelado'];
const emptyForm = { clientId: '', title: '', projectType: 'Fotovoltaico', utilityCompany: 'CPFL Paulista', consumerUnit: '', connectionType: 'Microgeração', installationAddress: '', city: 'Bauru', state: 'SP', systemPowerKw: '', panelCount: '', panelPowerW: '620', inverterModel: '', phase: 'Bifásico', expectedDeadline: '', protocolNumber: '', responsibleName: '', notes: '' };
const emptyTask = { title: '', priority: 'Normal', dueDate: '', assignedTo: '' };
const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const date = (value) => value ? new Date(value).toLocaleDateString('pt-BR') : 'Sem prazo';

function statusTone(status) {
  if (['Aprovado', 'Homologado'].includes(status)) return 'approved';
  if (['Em exigência', 'Cancelado'].includes(status)) return 'danger';
  if (['Protocolado', 'Em projeto'].includes(status)) return 'active';
  return 'neutral';
}

export default function ProjetosEngenhariaPage() {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [activities, setActivities] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [task, setTask] = useState(emptyTask);
  const [activityText, setActivityText] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [tab, setTab] = useState('visao');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [projectRows, clientRows] = await Promise.all([listEngineeringProjects(), listClients()]);
      setProjects(projectRows);
      setClients(clientRows);
    } catch (error) {
      setMessage(error?.message || 'Não foi possível carregar os projetos.');
    } finally { setLoading(false); }
  };

  useEffect(() => { queueMicrotask(load); }, []);

  const openProject = async (project) => {
    setSelected(project);
    setTab('visao');
    try {
      const [activityRows, documentRows, taskRows] = await Promise.all([listProjectActivities(project.id), listProjectDocuments(project.id), listProjectTasks(project.id)]);
      setActivities(activityRows); setDocuments(documentRows); setTasks(taskRows);
    } catch (error) { setMessage(error?.message || 'Não foi possível abrir o projeto.'); }
  };

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesStatus = statusFilter === 'Todos' || project.status === statusFilter;
      const matchesTerm = !term || [project.title, project.projectNumber, project.client?.name, project.utilityCompany, project.city, project.consumerUnit].filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
      return matchesStatus && matchesTerm;
    });
  }, [projects, query, statusFilter]);

  const indicators = useMemo(() => ({ active: projects.filter((item) => !['Homologado', 'Cancelado'].includes(item.status)).length, pending: projects.filter((item) => ['Cadastro', 'Aguardando documentos', 'Em exigência'].includes(item.status)).length, protocol: projects.filter((item) => item.status === 'Protocolado').length, approved: projects.filter((item) => ['Aprovado', 'Homologado'].includes(item.status)).length }), [projects]);

  const updateForm = ({ target: { name, value } }) => setForm((current) => ({ ...current, [name]: value }));
  const chooseClient = (clientId) => {
    const client = clients.find((item) => item.id === clientId);
    setForm((current) => ({ ...current, clientId, installationAddress: client?.address || current.installationAddress, city: client?.city || current.city, state: client?.state || 'SP' }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) { setMessage('Informe o nome ou referência do projeto.'); return; }
    setSaving(true); setMessage('');
    try {
      const created = await createEngineeringProject(form);
      setProjects((current) => [created, ...current]); setForm(emptyForm); setShowForm(false); await openProject(created); setMessage('Projeto cadastrado e timeline iniciada.');
    } catch (error) { setMessage(error?.message || 'Não foi possível salvar o projeto.'); } finally { setSaving(false); }
  };

  const changeStatus = async (event) => {
    if (!selected) return;
    const nextStatus = event.target.value;
    try {
      const updated = await updateEngineeringProject(selected.id, { ...selected, status: nextStatus });
      setSelected(updated); setProjects((current) => current.map((item) => item.id === updated.id ? updated : item));
      await addProjectActivity(selected.id, 'Status', `Status alterado para ${nextStatus}`);
      setActivities((current) => [{ activity_type: 'Status', title: `Status alterado para ${nextStatus}`, description: '', created_at: new Date().toISOString() }, ...current]);
    } catch (error) { setMessage(error?.message || 'Não foi possível atualizar o status.'); }
  };

  const addActivity = async (event) => {
    event.preventDefault(); if (!selected || !activityText.trim()) return;
    try { const created = await addProjectActivity(selected.id, 'Nota', 'Atualização da equipe', activityText); setActivities((current) => [created, ...current]); setActivityText(''); } catch (error) { setMessage(error?.message || 'Não foi possível registrar a atualização.'); }
  };

  const addDocument = async (event) => {
    event.preventDefault(); if (!selected || !documentName.trim()) return;
    try { const created = await addProjectDocument(selected.id, { name: documentName, documentType: 'Documento técnico' }); setDocuments((current) => [created, ...current]); setDocumentName(''); } catch (error) { setMessage(error?.message || 'Não foi possível registrar o documento.'); }
  };

  const advanceDocument = async (row) => {
    const next = { Pendente: 'Recebido', Recebido: 'Validado', Validado: 'Rejeitado', Rejeitado: 'Pendente' }[row.status] || 'Recebido';
    try { const updated = await updateProjectDocument(row.id, next); setDocuments((current) => current.map((item) => item.id === updated.id ? updated : item)); } catch (error) { setMessage(error?.message || 'Não foi possível atualizar o documento.'); }
  };

  const addTask = async (event) => {
    event.preventDefault(); if (!selected || !task.title.trim()) return;
    try { const created = await addProjectTask(selected.id, task); setTasks((current) => [...current, created]); setTask(emptyTask); } catch (error) { setMessage(error?.message || 'Não foi possível adicionar a tarefa.'); }
  };

  const toggleTask = async (row) => {
    try { const updated = await updateProjectTask(row.id, row.status === 'Concluída' ? 'Pendente' : 'Concluída'); setTasks((current) => current.map((item) => item.id === updated.id ? updated : item)); } catch (error) { setMessage(error?.message || 'Não foi possível atualizar a tarefa.'); }
  };

  return (
    <FinanceLayout title="Projetos de engenharia" subtitle="Cadastro técnico, homologação, documentos, tarefas e timeline em um único projeto." compactHeader>
      <div className="engineering-projects-page">
        {message && <div className="engineering-message">{message}<button type="button" onClick={() => setMessage('')}><X size={15} /></button></div>}
        <section className="engineering-hero"><div><span className="engineering-kicker">Centro de projetos</span><h2>Do cadastro à homologação</h2><p>Uma visão clara para o engenheiro saber o que está pendente, qual é o próximo prazo e quem precisa agir.</p></div><button className="engineering-primary" type="button" onClick={() => setShowForm((value) => !value)}><Plus size={18} /> Novo projeto</button></section>
        <section className="engineering-kpis"><article><FolderKanban size={19} /><span>Projetos ativos</span><strong>{indicators.active}</strong></article><article><ClipboardList size={19} /><span>Pendências de cadastro</span><strong>{indicators.pending}</strong></article><article><Send size={19} /><span>Protocolados</span><strong>{indicators.protocol}</strong></article><article><CheckCircle2 size={19} /><span>Aprovados</span><strong>{indicators.approved}</strong></article></section>

        {showForm && <section className="engineering-panel engineering-form-panel"><div className="engineering-panel-heading"><div><span className="engineering-kicker">Novo registro</span><h3>Dados do projeto</h3><p>Preencha o essencial agora. O restante pode ser completado pelo engenheiro na timeline.</p></div><button type="button" className="engineering-icon-button" onClick={() => setShowForm(false)}><X size={18} /></button></div><form className="engineering-form" onSubmit={submit}>
          <label><span>Cliente central *</span><select value={form.clientId} onChange={(event) => chooseClient(event.target.value)}><option value="">Selecionar cliente</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name} · {client.phone}</option>)}</select></label>
          <label><span>Nome / referência do projeto *</span><input required name="title" value={form.title} onChange={updateForm} placeholder="Ex.: Sistema João da Silva" /></label>
          <label><span>Tipo de projeto</span><select name="projectType" value={form.projectType} onChange={updateForm}><option>Fotovoltaico</option><option>Aumento de potência</option><option>Grid Zero</option><option>Projeto elétrico BT</option><option>Outro</option></select></label>
          <label><span>Distribuidora</span><input name="utilityCompany" value={form.utilityCompany} onChange={updateForm} placeholder="Ex.: CPFL Paulista" /></label>
          <label><span>Unidade consumidora</span><input name="consumerUnit" value={form.consumerUnit} onChange={updateForm} /></label>
          <label><span>Modalidade</span><select name="connectionType" value={form.connectionType} onChange={updateForm}><option>Microgeração</option><option>Minigeração</option><option>Grid Zero</option><option>Autoconsumo remoto</option></select></label>
          <label className="wide"><span>Endereço da instalação</span><input name="installationAddress" value={form.installationAddress} onChange={updateForm} /></label>
          <label><span>Cidade</span><input name="city" value={form.city} onChange={updateForm} /></label><label><span>UF</span><input name="state" value={form.state} onChange={updateForm} maxLength="2" /></label>
          <label><span>Potência do sistema (kWp)</span><input type="number" step="0.001" min="0" name="systemPowerKw" value={form.systemPowerKw} onChange={updateForm} /></label><label><span>Quantidade de módulos</span><input type="number" min="0" name="panelCount" value={form.panelCount} onChange={updateForm} /></label><label><span>Potência do módulo (W)</span><input type="number" min="0" name="panelPowerW" value={form.panelPowerW} onChange={updateForm} /></label>
          <label><span>Inversor / equipamento</span><input name="inverterModel" value={form.inverterModel} onChange={updateForm} placeholder="Marca e modelo" /></label><label><span>Fase</span><select name="phase" value={form.phase} onChange={updateForm}><option>Monofásico</option><option>Bifásico</option><option>Trifásico</option></select></label><label><span>Prazo interno</span><input type="date" name="expectedDeadline" value={form.expectedDeadline} onChange={updateForm} /></label><label><span>Responsável</span><input name="responsibleName" value={form.responsibleName} onChange={updateForm} placeholder="Engenheiro ou projetista" /></label><label><span>Número do protocolo</span><input name="protocolNumber" value={form.protocolNumber} onChange={updateForm} /></label>
          <label className="wide"><span>Observações técnicas</span><textarea name="notes" value={form.notes} onChange={updateForm} placeholder="Premissas, pendências iniciais e orientações para a engenharia." /></label>
          <div className="engineering-form-actions wide"><button className="engineering-primary" disabled={saving}>{saving ? 'Salvando...' : 'Cadastrar projeto'}</button></div>
        </form></section>}

        <section className="engineering-layout"><div className="engineering-panel engineering-list-panel"><div className="engineering-panel-heading"><div><span className="engineering-kicker">Carteira de engenharia</span><h3>Projetos cadastrados</h3></div><strong className="engineering-count">{filtered.length}</strong></div><div className="engineering-filters"><label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente, projeto ou UC" /></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>Todos</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></div><div className="engineering-project-list">{loading ? <p className="engineering-empty">Carregando projetos...</p> : filtered.length === 0 ? <p className="engineering-empty">Nenhum projeto encontrado.</p> : filtered.map((project) => <button type="button" className={`engineering-project-row ${selected?.id === project.id ? 'selected' : ''}`} key={project.id} onClick={() => openProject(project)}><div className="engineering-project-row-top"><strong>#{project.projectNumber || '—'} · {project.title}</strong><span className={`engineering-status ${statusTone(project.status)}`}>{project.status}</span></div><p><UserRound size={14} /> {project.client?.name || 'Sem cliente'} <span>•</span> <MapPin size={14} /> {project.city || 'Sem cidade'}</p><small><CalendarDays size={13} /> Prazo: {date(project.expectedDeadline)} {project.utilityCompany ? ` · ${project.utilityCompany}` : ''}</small></button>)}</div></div>

          {selected ? <section className="engineering-panel engineering-detail-panel"><div className="engineering-detail-header"><div><span className="engineering-kicker">Projeto #{selected.projectNumber}</span><h3>{selected.title}</h3><p>{selected.client?.name || 'Cliente não vinculado'} · {selected.projectType} · {selected.city || 'Cidade não informada'}</p></div><select value={selected.status} onChange={changeStatus}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></div><div className="engineering-progress"><div className="engineering-progress-line" style={{ '--progress': `${Math.max(6, ((statuses.indexOf(selected.status) + 1) / statuses.length) * 100)}%` }} /><div className="engineering-progress-steps">{['Cadastro', 'Em análise', 'Em projeto', 'Protocolado', 'Aprovado', 'Homologado'].map((step) => <span key={step} className={statuses.indexOf(selected.status) >= statuses.indexOf(step) ? 'done' : ''}><i />{step}</span>)}</div></div><nav className="engineering-tabs">{[['visao', 'Visão geral'], ['timeline', 'Timeline'], ['documentos', 'Documentos'], ['tarefas', 'Tarefas']].map(([key, label]) => <button type="button" className={tab === key ? 'active' : ''} key={key} onClick={() => setTab(key)}>{label}</button>)}</nav>
            {tab === 'visao' && <div className="engineering-detail-grid"><article><span>Distribuidora</span><strong>{selected.utilityCompany || 'Não informado'}</strong></article><article><span>Unidade consumidora</span><strong>{selected.consumerUnit || 'Não informado'}</strong></article><article><span>Potência</span><strong>{selected.systemPowerKw ? `${selected.systemPowerKw} kWp` : 'Não informado'}</strong></article><article><span>Módulos</span><strong>{selected.panelCount || 0} × {selected.panelPowerW || 0} W</strong></article><article><span>Inversor</span><strong>{selected.inverterModel || 'Não informado'}</strong></article><article><span>Prazo interno</span><strong>{date(selected.expectedDeadline)}</strong></article><article className="wide"><span>Endereço</span><strong>{selected.installationAddress || 'Não informado'} {selected.city ? `— ${selected.city}/${selected.state}` : ''}</strong></article><article className="wide"><span>Observações técnicas</span><p>{selected.notes || 'Nenhuma observação registrada.'}</p></article></div>}
            {tab === 'timeline' && <div className="engineering-tab-content"><form className="engineering-inline-form" onSubmit={addActivity}><input value={activityText} onChange={(event) => setActivityText(event.target.value)} placeholder="Registrar atualização, exigência ou contato..." /><button className="engineering-primary"><Plus size={16} /> Adicionar</button></form><div className="engineering-timeline">{activities.map((item) => <div className="engineering-timeline-item" key={item.id || `${item.title}-${item.created_at}`}><span className="engineering-timeline-dot" /><div><small>{item.activity_type} · {new Date(item.created_at).toLocaleString('pt-BR')}</small><strong>{item.title}</strong>{item.description && <p>{item.description}</p>}</div></div>)}{!activities.length && <p className="engineering-empty">A timeline será preenchida conforme a equipe trabalhar no projeto.</p>}</div></div>}
            {tab === 'documentos' && <div className="engineering-tab-content"><form className="engineering-inline-form" onSubmit={addDocument}><input value={documentName} onChange={(event) => setDocumentName(event.target.value)} placeholder="Ex.: Fatura de energia, ART, diagrama unifilar" /><button className="engineering-primary"><FilePlus2 size={16} /> Registrar documento</button></form><p className="engineering-helper">Clique no status para avançar o checklist: pendente, recebido, validado ou rejeitado.</p><div className="engineering-record-list">{documents.map((item) => <div key={item.id}><FilePlus2 size={17} /><div><strong>{item.name}</strong><small>{item.document_type}</small></div><button type="button" className={`engineering-document-status ${item.status.toLowerCase()}`} onClick={() => advanceDocument(item)}>{item.status}</button></div>)}{!documents.length && <p className="engineering-empty">Nenhum documento registrado.</p>}</div></div>}
            {tab === 'tarefas' && <div className="engineering-tab-content"><form className="engineering-task-form" onSubmit={addTask}><input value={task.title} onChange={(event) => setTask((current) => ({ ...current, title: event.target.value }))} placeholder="Nova tarefa técnica" /><select value={task.priority} onChange={(event) => setTask((current) => ({ ...current, priority: event.target.value }))}><option>Normal</option><option>Alta</option><option>Urgente</option><option>Baixa</option></select><input type="date" value={task.dueDate} onChange={(event) => setTask((current) => ({ ...current, dueDate: event.target.value }))} /><button className="engineering-primary"><Plus size={16} /> Criar</button></form><div className="engineering-record-list">{tasks.map((item) => <button type="button" className="engineering-task-row" key={item.id} onClick={() => toggleTask(item)}><span className={`engineering-check ${item.status === 'Concluída' ? 'checked' : ''}`}>{item.status === 'Concluída' ? <CheckCircle2 size={15} /> : null}</span><div><strong className={item.status === 'Concluída' ? 'completed' : ''}>{item.title}</strong><small>{item.priority} · {item.due_date ? date(item.due_date) : 'Sem prazo'}</small></div></button>)}{!tasks.length && <p className="engineering-empty">Nenhuma tarefa criada para este projeto.</p>}</div></div>}
          </section> : <section className="engineering-panel engineering-no-selection"><FolderKanban size={38} /><h3>Selecione um projeto</h3><p>Abra um projeto para acompanhar os dados técnicos, documentos e próximos passos.</p></section>}
        </section>
      </div>
    </FinanceLayout>
  );
}
