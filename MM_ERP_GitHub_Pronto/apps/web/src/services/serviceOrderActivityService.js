import { supabase } from '../lib/supabase.js';

export const SERVICE_ACTIVITY_TYPES = [
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

export const SERVICE_ACTIVITY_TEMPLATES = {
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

export function newServiceActivity(position = 0) {
  return {
    localId: crypto.randomUUID(),
    activity_type: 'Limpeza',
    status: 'concluido',
    condition: 'conforme',
    observation: SERVICE_ACTIVITY_TEMPLATES.Limpeza.conforme,
    position,
  };
}

export async function listServiceOrderActivities(serviceOrderId) {
  const { data, error } = await supabase
    .from('service_order_activities')
    .select('*')
    .eq('service_order_id', serviceOrderId)
    .order('position')
    .order('created_at');
  if (error) throw error;
  return data || [];
}

export async function saveServiceOrderActivities(serviceOrderId, activities) {
  const { error: deleteError } = await supabase
    .from('service_order_activities')
    .delete()
    .eq('service_order_id', serviceOrderId);
  if (deleteError) throw deleteError;

  if (!activities.length) return [];

  const payload = activities.map((item, index) => ({
    service_order_id: serviceOrderId,
    activity_type: item.activity_type,
    status: item.status,
    condition: item.condition,
    observation: item.observation || null,
    position: index,
    completed_at: item.status === 'concluido' ? new Date().toISOString() : null,
  }));

  const { data, error } = await supabase
    .from('service_order_activities')
    .insert(payload)
    .select('*')
    .order('position');
  if (error) throw error;
  return data || [];
}
