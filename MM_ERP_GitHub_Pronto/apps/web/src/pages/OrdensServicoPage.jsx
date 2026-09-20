import React, { useEffect, useMemo, useState } from 'react';
import { Camera, CheckCircle2, FileDown, Plus, Save, Trash2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import { requireSupabase } from '../services/erpDatabaseService.js';
import { supabase } from '../lib/supabase.js';

const ACTIVITY_TYPES = [
  'Limpeza',
  'Inspeção Visual',
  'Ajustes',
  'Medições Elétricas',
  'Inversor',
  'Conectores',
  'Estrutura',
  'Monitoramento',
  'DPS',
  'Outro',
];

const CONDITION_LABELS = {
  conforme: 'Conforme',
  atencao: 'Atenção',
  nao_conforme: 'Não Conforme',
};

const OBSERVATION_TEMPLATES = {
  Limpeza: {
    conforme: 'Limpeza realizada nos módulos fotovoltaicos, sem identificação de trincas, avarias ou anomalias visuais durante a inspeção.',
    atencao: 'Limpeza realizada. Foram identificados pontos que exigem acompanhamento preventivo.',
    nao_conforme: 'Limpeza realizada, porém foram identificadas não conformidades que exigem correção.',
  },
  'Inspeção Visual': {
    conforme: 'Realizada inspeção visual dos módulos, estrutura, cabeamento e conectores, sem anomalias aparentes.',
    atencao: 'Inspeção visual concluída com pontos de atenção registrados para acompanhamento.',
    nao_conforme: 'Inspeção visual identificou não conformidades que necessitam correção.',
  },
  Ajustes: {
    conforme: 'Ajustes preventivos realizados e componentes verificados em condições adequadas.',
    atencao: 'Ajustes realizados, permanecendo pontos para acompanhamento técnico.',
    nao_conforme: 'Foram identificados ajustes corretivos adicionais necessários.',
  },
  'Medições Elétricas': {
    conforme: 'Medições elétricas realizadas com valores compatíveis com a operação normal do sistema.',
    atencao: 'Medições realizadas com valores que merecem acompanhamento.',
    nao_conforme: 'Medições elétricas indicaram valores fora do esperado e requerem diagnóstico.',
  },
  Inversor: {
    conforme: 'Inversor operando normalmente, sem alarmes ativos ou falhas registradas durante a inspeção.',
    atencao: 'Inversor em operação, com ponto de atenção registrado para acompanhamento.',
    nao_conforme: 'Inversor apresentou falha, alarme ou condição que requer intervenção técnica.',
  },
  Conectores: {
    conforme: 'Conectores inspecionados, firmes e sem sinais aparentes de aquecimento ou dano.',
    atencao: 'Conectores inspecionados com ponto de atenção preventivo.',
    nao_conforme: 'Foram identificados conectores com necessidade de correção ou substituição.',
  },
  Estrutura: {
    conforme: 'Estrutura de fixação inspecionada, sem folgas ou anomalias aparentes.',
    atencao: 'Estrutura inspecionada com pontos que exigem acompanhamento preventivo.',
    nao_conforme: 'Estrutura apresentou não conformidade que requer correção.',
  },
  Monitoramento: {
    conforme: 'Monitoramento verificado e sistema comunicando normalmente.',
    atencao: 'Monitoramento ativo, porém com ponto de atenção registrado.',
    nao_conforme: 'Monitoramento apresentou falha de comunicação ou indisponibilidade.',
  },
  DPS: {
    conforme: 'DPS inspecionado visualmente e sem indicação aparente de falha.',
    atencao: 'DPS inspecionado com recomendação de acompanhamento.',
    nao_conforme: 'DPS apresentou indicação de falha e deve ser substituído.',
  },
  Outro: {
    conforme: 'Atividade concluída conforme inspeção técnica.',
    atencao: 'Atividade concluída com ponto de atenção registrado.',
    nao_conforme: 'Atividade apresentou não conformidade registrada.',
  },
};

function newActivity(position = 0) {
  return {
    id: crypto.randomUUID(),
    activity_type: 'Limpeza',
    status: 'concluido',
    condition: 'conforme',
    observation: OBSERVATION_TEMPLATES.Limpeza.conforme,
    position,
    localOnly: true,
  };
}

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString('pt-BR');
}

export default function OrdensServicoPage() {
  const [orders, setOrders] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [activities, setActivities] = useState([]);
  const [signatureName, setSignatureName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const selected = useMemo(() => orders.find((x) => x.id === selectedId), [orders, selectedId]);

  async function loadOrders() {
    requireSupabase();
    setLoading(true);
    const { data, error } = await supabase
      .from('service_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    setOrders(data || []);
    if (!selectedId && data?.[0]?.id) setSelectedId(data[0].id);
    setLoading(false);
  }

  async function loadActivities(orderId) {
    if (!orderId) return setActivities([]);
    const { data, error } = await supabase
      .from('service_order_activities')
      .select('*')
      .eq('service_order_id', orderId)
      .order('position')
      .order('created_at');
    if (error) throw error;
    setActivities(data?.length ? data : [newActivity(0)]);
  }

  useEffect(() => {
    loadOrders().catch((e) => {
      console.error(e);
      setMessage('Não foi possível carregar as ordens de serviço.');
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    loadActivities(selectedId).catch(console.error);
    const current = orders.find((x) => x.id === selectedId);
    setSignatureName(current?.customer_signature_name || current?.customer_name || '');
  }, [selectedId]);

  async function createOrder() {
    const customerName = window.prompt('Nome do cliente');
    if (!customerName) return;
    const serviceType = window.prompt('Tipo de serviço', 'Manutenção preventiva') || 'Manutenção preventiva';
    const address = window.prompt('Endereço da instalação') || '';
    const { data, error } = await supabase.from('service_orders').insert({
      customer_name: customerName,
      service_type: serviceType,
      installation_address: address,
      status: 'agendada',
      scheduled_at: new Date().toISOString(),
    }).select('*').single();
    if (error) throw error;
    setOrders((old) => [data, ...old]);
    setSelectedId(data.id);
  }

  function updateActivity(index, patch) {
    setActivities((old) => old.map((item, i) => {
      if (i !== index) return item;
      const next = { ...item, ...patch };
      if (patch.activity_type || patch.condition) {
        next.observation = OBSERVATION_TEMPLATES[next.activity_type]?.[next.condition] || next.observation;
      }
      return next;
    }));
  }

  async function saveAll() {
    if (!selectedId) return;
    setSaving(true);
    setMessage('');
    try {
      const rows = activities.map((a, i) => ({
        id: a.localOnly ? undefined : a.id,
        service_order_id: selectedId,
        activity_type: a.activity_type,
        status: a.status,
        condition: a.condition,
        observation: a.observation,
        position: i,
        completed_at: a.status === 'concluido' ? new Date().toISOString() : null,
      }));
      await supabase.from('service_order_activities').delete().eq('service_order_id', selectedId);
      const { error: activitiesError } = await supabase.from('service_order_activities').insert(rows.map(({ id, ...r }) => r));
      if (activitiesError) throw activitiesError;

      const { error: orderError } = await supabase.from('service_orders').update({
        customer_signature_name: signatureName || null,
        customer_signature_at: signatureName ? new Date().toISOString() : null,
        status: 'concluida',
        completed_at: new Date().toISOString(),
      }).eq('id', selectedId);
      if (orderError) throw orderError;

      setMessage('Serviço salvo com sucesso.');
      await loadOrders();
      await loadActivities(selectedId);
    } catch (e) {
      console.error(e);
      setMessage('Erro ao salvar a execução do serviço.');
    } finally {
      setSaving(false);
    }
  }

  async function uploadPhoto(file, stage) {
    if (!file || !selectedId) return;
    setMessage('Enviando foto...');
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const storagePath = `${selectedId}/${stage}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from('service-orders').upload(storagePath, file, { upsert: false });
    if (uploadError) throw uploadError;
    const { error: photoError } = await supabase.from('service_order_photos').insert({
      service_order_id: selectedId,
      stage,
      storage_path: storagePath,
      caption: stage === 'antes' ? 'Foto antes do serviço' : stage === 'depois' ? 'Foto depois do serviço' : 'Foto durante o serviço',
    });
    if (photoError) throw photoError;
    setMessage('Foto registrada com sucesso.');
  }

  function generatePdf() {
    if (!selected) return;
    const doc = new jsPDF();
    let y = 16;
    const line = (text, size = 10, weight = 'normal') => {
      doc.setFontSize(size);
      doc.setFont('helvetica', weight);
      const chunks = doc.splitTextToSize(String(text || ''), 180);
      doc.text(chunks, 15, y);
      y += chunks.length * (size * 0.42) + 3;
      if (y > 275) { doc.addPage(); y = 16; }
    };
    line('MM Energia Solar - Relatório Técnico', 16, 'bold');
    line(`OS #${selected.order_number || selected.id.slice(0, 8)}`, 11, 'bold');
    line(`Cliente: ${selected.customer_name || '-'}`);
    line(`Serviço: ${selected.service_type || '-'}`);
    line(`Endereço: ${selected.installation_address || '-'}`);
    line(`Data: ${formatDate(selected.completed_at || new Date())}`);
    y += 3;
    line('Atividades executadas', 12, 'bold');
    activities.forEach((a, i) => {
      line(`${i + 1}. ${a.activity_type} - ${CONDITION_LABELS[a.condition] || a.condition}`, 10, 'bold');
      line(a.observation || 'Sem observação.');
    });
    y += 3;
    line(`Responsável/cliente: ${signatureName || selected.customer_name || '-'}`, 10, 'bold');
    line('Declaro ciência das atividades e observações registradas neste atendimento.');
    doc.save(`OS-${selected.order_number || selected.id.slice(0, 8)}.pdf`);
    supabase.from('service_orders').update({ technical_report_generated_at: new Date().toISOString() }).eq('id', selected.id);
  }

  return (
    <FinanceLayout
      title="Ordens de Serviço"
      subtitle="Execução em campo, checklist, fotos, assinatura e relatório técnico no celular."
    >
      <section className="finance-panel">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div>
            <h2>Atendimentos</h2>
            <p className="dashboard-note">Abra uma OS existente ou crie uma nova para instalação, manutenção, limpeza ou vistoria.</p>
          </div>
          <button className="finance-button inline-button" onClick={() => createOrder().catch(console.error)}>
            <Plus size={16} /> Nova OS
          </button>
        </div>

        <div className="mt-4">
          <select className="w-full rounded-xl border border-slate-300 bg-white p-3" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            <option value="">Selecione uma ordem de serviço</option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                #{order.order_number || order.id.slice(0, 8)} • {order.customer_name || 'Sem cliente'} • {order.service_type || 'Serviço'}
              </option>
            ))}
          </select>
        </div>
      </section>

      {loading ? <section className="finance-panel">Carregando...</section> : null}

      {selected && (
        <>
          <section className="finance-panel">
            <h2>Dados do atendimento</h2>
            <div className="grid md:grid-cols-2 gap-3 mt-3 text-sm">
              <div><strong>Cliente:</strong> {selected.customer_name || '-'}</div>
              <div><strong>Tipo:</strong> {selected.service_type || '-'}</div>
              <div><strong>Endereço:</strong> {selected.installation_address || '-'}</div>
              <div><strong>Status:</strong> {selected.status || '-'}</div>
            </div>
          </section>

          <section className="finance-panel">
            <h2>Atividades da Manutenção</h2>
            <p className="dashboard-note">Selecione a atividade, marque a condição e edite a observação se necessário.</p>

            <div className="space-y-4 mt-4">
              {activities.map((activity, index) => (
                <div key={activity.id || index} className="rounded-2xl border border-slate-200 p-4 bg-white">
                  <div className="grid md:grid-cols-[1fr_1fr_auto] gap-3">
                    <select className="rounded-xl border border-slate-300 p-3" value={activity.activity_type} onChange={(e) => updateActivity(index, { activity_type: e.target.value })}>
                      {ACTIVITY_TYPES.map((item) => <option key={item}>{item}</option>)}
                    </select>
                    <select className="rounded-xl border border-slate-300 p-3" value={activity.status} onChange={(e) => updateActivity(index, { status: e.target.value })}>
                      <option value="pendente">Pendente</option>
                      <option value="em_andamento">Em andamento</option>
                      <option value="concluido">Concluído</option>
                      <option value="nao_aplicavel">Não aplicável</option>
                    </select>
                    <button aria-label="Excluir atividade" className="rounded-xl border border-red-200 px-3 text-red-600" onClick={() => setActivities((old) => old.filter((_, i) => i !== index))}>
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="mt-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sugestões de observação</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {[
                        ['conforme', '🟢 Conforme'],
                        ['atencao', '🟡 Atenção'],
                        ['nao_conforme', '🔴 Não Conforme'],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          onClick={() => updateActivity(index, { condition: value })}
                          className={`rounded-full border px-3 py-1.5 text-sm ${activity.condition === value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="block mt-3 text-sm font-semibold">Observação</label>
                  <textarea
                    className="mt-1 w-full min-h-28 rounded-xl border border-slate-300 p-3"
                    value={activity.observation || ''}
                    onChange={(e) => updateActivity(index, { observation: e.target.value })}
                    placeholder="Descreva a observação técnica."
                  />
                </div>
              ))}
            </div>

            <button className="mt-4 rounded-xl border border-slate-300 px-4 py-2 flex items-center gap-2" onClick={() => setActivities((old) => [...old, newActivity(old.length)])}>
              <Plus size={16} /> Adicionar atividade
            </button>
          </section>

          <section className="finance-panel">
            <h2>Fotos do serviço</h2>
            <p className="dashboard-note">Registre evidências antes, durante e depois. No celular, o botão abre a câmera.</p>
            <div className="grid sm:grid-cols-3 gap-3 mt-4">
              {['antes', 'durante', 'depois'].map((stage) => (
                <label key={stage} className="rounded-2xl border border-dashed border-slate-300 p-4 text-center cursor-pointer">
                  <Camera className="mx-auto mb-2" size={22} />
                  <strong className="capitalize">{stage}</strong>
                  <input
                    hidden
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => uploadPhoto(e.target.files?.[0], stage).catch((err) => { console.error(err); setMessage('Erro ao enviar a foto.'); })}
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="finance-panel">
            <h2>Assinatura / aceite</h2>
            <p className="dashboard-note">Registre o nome de quem acompanhou e confirmou o atendimento.</p>
            <input
              className="mt-3 w-full rounded-xl border border-slate-300 p-3"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              placeholder="Nome do cliente ou responsável"
            />
            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
              Ao finalizar, fica registrado que o responsável tomou ciência das atividades e observações do atendimento.
            </div>
          </section>

          <section className="finance-panel">
            {message && <div className="mb-3 rounded-xl bg-slate-100 p-3 text-sm">{message}</div>}
            <div className="flex flex-wrap gap-3">
              <button className="finance-button inline-button" disabled={saving} onClick={saveAll}>
                <Save size={16} /> {saving ? 'Salvando...' : 'Salvar e finalizar'}
              </button>
              <button className="rounded-xl border border-slate-300 px-4 py-2 flex items-center gap-2" onClick={generatePdf}>
                <FileDown size={16} /> Gerar PDF
              </button>
              <span className="flex items-center gap-2 text-sm text-slate-500"><CheckCircle2 size={16} /> Fluxo otimizado para celular</span>
            </div>
          </section>
        </>
      )}
    </FinanceLayout>
  );
}
