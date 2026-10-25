import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

function ensureDatabase() {
  if (!isSupabaseConfigured || !supabase) throw new Error('O Supabase não está configurado nesta publicação.');
}

const projectFields = '*, clients(id, name, phone, city, state)';

function fromProject(row) {
  return {
    ...row,
    projectNumber: row.project_number,
    clientId: row.client_id,
    projectType: row.project_type,
    utilityCompany: row.utility_company || '',
    consumerUnit: row.consumer_unit || '',
    connectionType: row.connection_type || '',
    installationAddress: row.installation_address || '',
    systemPowerKw: Number(row.system_power_kw || 0),
    panelCount: Number(row.panel_count || 0),
    panelPowerW: Number(row.panel_power_w || 0),
    inverterModel: row.inverter_model || '',
    expectedDeadline: row.expected_deadline || '',
    protocolNumber: row.protocol_number || '',
    responsibleName: row.responsible_name || '',
    client: row.clients || null,
  };
}

export async function listEngineeringProjects() {
  ensureDatabase();
  const { data, error } = await supabase.from('engineering_projects').select(projectFields).order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(fromProject);
}

export async function createEngineeringProject(project) {
  ensureDatabase();
  const { data, error } = await supabase.from('engineering_projects').insert({
    client_id: project.clientId || null,
    title: project.title.trim(),
    project_type: project.projectType || 'Fotovoltaico',
    status: project.status || 'Cadastro',
    utility_company: project.utilityCompany?.trim() || null,
    consumer_unit: project.consumerUnit?.trim() || null,
    connection_type: project.connectionType?.trim() || null,
    installation_address: project.installationAddress?.trim() || null,
    city: project.city?.trim() || null,
    state: project.state?.trim().toUpperCase() || 'SP',
    system_power_kw: Number(project.systemPowerKw || 0),
    panel_count: Number(project.panelCount || 0),
    panel_power_w: Number(project.panelPowerW || 0),
    inverter_model: project.inverterModel?.trim() || null,
    phase: project.phase?.trim() || null,
    expected_deadline: project.expectedDeadline || null,
    protocol_number: project.protocolNumber?.trim() || null,
    responsible_name: project.responsibleName?.trim() || null,
    notes: project.notes?.trim() || null,
  }).select(projectFields).single();
  if (error) throw error;
  await addProjectActivity(data.id, 'Status', 'Projeto cadastrado', 'Cadastro inicial do projeto de engenharia.');
  const documentosIniciais = ['Fatura de energia', 'Documento do titular', 'ART ou TRT', 'Diagrama unifilar'];
  await Promise.all(documentosIniciais.map((name) => addProjectDocument(data.id, { name, documentType: 'Checklist inicial' })));
  return fromProject(data);
}

export async function updateEngineeringProject(id, project) {
  ensureDatabase();
  const { data, error } = await supabase.from('engineering_projects').update({
    status: project.status,
    utility_company: project.utilityCompany?.trim() || null,
    consumer_unit: project.consumerUnit?.trim() || null,
    connection_type: project.connectionType?.trim() || null,
    installation_address: project.installationAddress?.trim() || null,
    city: project.city?.trim() || null,
    state: project.state?.trim().toUpperCase() || 'SP',
    system_power_kw: Number(project.systemPowerKw || 0),
    panel_count: Number(project.panelCount || 0),
    panel_power_w: Number(project.panelPowerW || 0),
    inverter_model: project.inverterModel?.trim() || null,
    phase: project.phase?.trim() || null,
    expected_deadline: project.expectedDeadline || null,
    protocol_number: project.protocolNumber?.trim() || null,
    responsible_name: project.responsibleName?.trim() || null,
    notes: project.notes?.trim() || null,
  }).eq('id', id).select(projectFields).single();
  if (error) throw error;
  return fromProject(data);
}

export async function listProjectActivities(projectId) {
  ensureDatabase();
  const { data, error } = await supabase.from('engineering_project_activities').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addProjectActivity(projectId, activityType, title, description = '') {
  ensureDatabase();
  const { data, error } = await supabase.from('engineering_project_activities').insert({ project_id: projectId, activity_type: activityType, title: title.trim(), description: description.trim() || null }).select('*').single();
  if (error) throw error;
  return data;
}

export async function listProjectDocuments(projectId) {
  ensureDatabase();
  const { data, error } = await supabase.from('engineering_project_documents').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addProjectDocument(projectId, document) {
  ensureDatabase();
  const { data, error } = await supabase.from('engineering_project_documents').insert({ project_id: projectId, document_type: document.documentType || 'Outro', name: document.name.trim(), status: document.status || 'Pendente', notes: document.notes?.trim() || null }).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateProjectDocument(id, status) {
  ensureDatabase();
  const { data, error } = await supabase.from('engineering_project_documents').update({ status }).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function listProjectTasks(projectId) {
  ensureDatabase();
  const { data, error } = await supabase.from('engineering_project_tasks').select('*').eq('project_id', projectId).order('due_date', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data || [];
}

export async function addProjectTask(projectId, task) {
  ensureDatabase();
  const { data, error } = await supabase.from('engineering_project_tasks').insert({ project_id: projectId, title: task.title.trim(), status: task.status || 'Pendente', priority: task.priority || 'Normal', due_date: task.dueDate || null, assigned_to: task.assignedTo?.trim() || null }).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateProjectTask(id, status) {
  ensureDatabase();
  const { data, error } = await supabase.from('engineering_project_tasks').update({ status }).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}
