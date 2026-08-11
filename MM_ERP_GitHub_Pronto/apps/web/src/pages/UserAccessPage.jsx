import React, { useEffect, useMemo, useState } from 'react';
import { KeyRound, Plus, RefreshCw, Save, ShieldCheck, UserCog, UserPlus } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import { supabase } from '../lib/supabase.js';
import { ERP_ACCESS_OPTIONS } from '../config/accessControl.js';

const EMPTY = {
  id: '', name: '', username: '', password: '', role: 'comercial', active: true,
  permissions: ['precos', 'clientes', 'calculadora', 'propostas', 'agenda', 'contratos'],
};

const ROLE_LABELS = {
  comercial: 'Vendedor',
  financeiro: 'Financeiro',
  engenharia: 'Engenharia',
  instalador: 'Instalador',
  admin: 'Administrador',
};

export default function UserAccessPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const editing = Boolean(form.id);

  async function callAdmin(payload) {
    const { data, error } = await supabase.functions.invoke('erp-user-admin', { body: payload });
    if (error) throw new Error(error.message || 'Erro ao acessar o gerenciamento de usuários.');
    if (data?.error) throw new Error(data.error);
    return data;
  }

  async function loadUsers() {
    setLoading(true);
    setMessage('');
    try {
      const data = await callAdmin({ action: 'list' });
      setUsers(data.users || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUsers(); }, []);

  const selectedCount = useMemo(() => form.permissions.length, [form.permissions]);

  function togglePermission(key) {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(key)
        ? current.permissions.filter((item) => item !== key)
        : [...current.permissions, key],
    }));
  }

  function editUser(user) {
    setForm({
      id: user.id,
      name: user.name || '',
      username: user.username || '',
      password: '',
      role: user.role || 'comercial',
      active: user.active !== false,
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function save() {
    if (!form.name.trim() || !form.username.trim()) {
      setMessage('Informe nome e usuário.');
      return;
    }
    if (!editing && form.password.length < 6) {
      setMessage('A senha inicial deve ter pelo menos 6 caracteres.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      await callAdmin({
        action: editing ? 'update' : 'create',
        id: form.id || undefined,
        name: form.name,
        username: form.username,
        password: form.password || undefined,
        role: form.role,
        active: form.active,
        permissions: form.permissions,
      });
      setMessage(editing ? 'Usuário atualizado com sucesso.' : 'Usuário criado com sucesso.');
      setForm(EMPTY);
      await loadUsers();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <FinanceLayout title="Usuários e acessos" subtitle="Crie usuários e escolha exatamente quais partes da ERP cada pessoa poderá acessar.">
      <section className="finance-panel user-admin-form">
        <div className="finance-panel-header">
          <div><h2>{editing ? 'Editar usuário' : 'Criar novo usuário'}</h2><p>O usuário entra usando apenas o nome de usuário e a senha cadastrados aqui.</p></div>
          {editing ? <UserCog size={24} /> : <UserPlus size={24} />}
        </div>

        <div className="finance-form">
          <label className="finance-field"><span>Nome</span><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex.: João Silva" /></label>
          <label className="finance-field"><span>Usuário para login</span><input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase().replace(/\s+/g, '') }))} placeholder="Ex.: vendedor" /></label>
          <label className="finance-field"><span>{editing ? 'Nova senha (opcional)' : 'Senha inicial'}</span><input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder={editing ? 'Deixe vazio para manter' : 'Mínimo 6 caracteres'} /></label>
          <label className="finance-field"><span>Perfil</span><select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>{Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>

        <div className="user-access-heading"><div><ShieldCheck size={20} /><strong>Acessos liberados</strong></div><span>{selectedCount} selecionado(s)</span></div>
        <div className="user-access-grid">
          {ERP_ACCESS_OPTIONS.map((option) => (
            <label className={`user-access-option ${form.permissions.includes(option.key) ? 'selected' : ''}`} key={option.key}>
              <input type="checkbox" checked={form.permissions.includes(option.key)} onChange={() => togglePermission(option.key)} />
              <span>{option.label}</span>
            </label>
          ))}
        </div>

        <label className="user-active-row"><input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} /><span>Usuário ativo</span></label>

        <div className="contract-generator-actions">
          {editing && <button type="button" className="finance-secondary-button" onClick={() => setForm(EMPTY)}>Cancelar edição</button>}
          <button type="button" className="finance-button" disabled={saving} onClick={save}><Save size={17} /> {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar usuário'}</button>
        </div>
        {message && <p className="crm-message contract-message">{message}</p>}
      </section>

      <section className="finance-panel">
        <div className="finance-panel-header"><div><h2>Usuários cadastrados</h2><p>Edite acessos, desative contas ou troque a senha.</p></div><button className="finance-secondary-button" type="button" onClick={loadUsers}><RefreshCw size={16} /> Atualizar</button></div>
        {loading ? <p className="crm-message">Carregando usuários...</p> : (
          <div className="user-admin-list">
            {users.map((user) => (
              <article className="user-admin-card" key={user.id}>
                <div className="user-admin-icon"><KeyRound size={20} /></div>
                <div className="user-admin-copy"><strong>{user.name || 'Sem nome'}</strong><span>@{user.username || 'sem-usuario'} · {ROLE_LABELS[user.role] || user.role}</span><small>{user.active === false ? 'Desativado' : `${Array.isArray(user.permissions) ? user.permissions.length : 'Todos'} acesso(s)`}</small></div>
                <button className="finance-secondary-button" type="button" onClick={() => editUser(user)}><UserCog size={16} /> Editar</button>
              </article>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .user-access-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:18px 0 10px}.user-access-heading>div{display:flex;align-items:center;gap:8px;color:#0f2c52}.user-access-heading>span{font-size:12px;color:#64748b}.user-access-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:9px}.user-access-option{display:flex;align-items:center;gap:9px;padding:11px 12px;border:1px solid #dbe3ee;border-radius:12px;background:#fff;cursor:pointer}.user-access-option.selected{background:#eef6ff;border-color:#8db7e5}.user-access-option input{width:17px;height:17px}.user-access-option span{font-weight:700;color:#334155}.user-active-row{display:flex;align-items:center;gap:9px;margin-top:16px;font-weight:800;color:#334155}.user-active-row input{width:18px;height:18px}.user-admin-list{display:grid;gap:9px}.user-admin-card{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:12px;align-items:center;border:1px solid #e2e8f0;border-radius:14px;padding:12px}.user-admin-icon{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:#eef5ff;color:#174e87}.user-admin-copy{display:grid;gap:2px}.user-admin-copy strong{color:#0f2c52}.user-admin-copy span,.user-admin-copy small{color:#64748b;font-size:12px}@media(max-width:650px){.user-access-grid{grid-template-columns:1fr}.user-admin-card{grid-template-columns:44px 1fr}.user-admin-card>button{grid-column:1/3;width:100%;justify-content:center}}
      `}</style>
    </FinanceLayout>
  );
}
