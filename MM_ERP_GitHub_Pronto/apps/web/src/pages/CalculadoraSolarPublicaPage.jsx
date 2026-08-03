import React, { useMemo, useState } from 'react';
import { submitSolarSimulation } from '../services/solarSimulationService';
import SaoPauloCitySelect from '../components/SaoPauloCitySelect.jsx';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

const initialForm = {
  name: '',
  phone: '',
  email: '',
  city: 'Bauru',
  state: 'SP',
  utilityCompany: 'CPFL Piratininga',
  connectionType: 'bifasica',
  monthlyBill: '',
};

export default function CalculadoraSolarPublicaPage() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const whatsappLink = useMemo(() => {
    if (!result) return '#';
    const text = [
      'Olá, MM Energia Solar! Fiz uma simulação pelo site.',
      `Nome: ${form.name}`,
      `Cidade: ${form.city}`,
      `Conta atual: ${money.format(Number(form.monthlyBill || 0))}`,
      `Sistema estimado: ${number.format(result.system_power_kw)} kWp`,
      `Módulos: ${result.panel_count} de ${result.panel_power_w} W`,
      `Economia estimada: ${money.format(result.estimated_monthly_savings)}/mês`,
    ].join('\n');
    return `https://wa.me/5514999999999?text=${encodeURIComponent(text)}`;
  }, [form, result]);

  const update = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await submitSolarSimulation(form);
      setResult(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message || 'Não foi possível concluir a simulação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(145deg,#071b34,#0f3763 55%,#0d766e)', color: '#fff', fontFamily: 'Inter,system-ui,sans-serif' }}>
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '48px 20px 72px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'center', flexWrap: 'wrap', marginBottom: 36 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 1.5, color: '#f7c948' }}>MM ENERGIA SOLAR</div>
            <h1 style={{ fontSize: 'clamp(34px,6vw,64px)', lineHeight: 1.02, margin: '12px 0 16px', maxWidth: 720 }}>
              Descubra quanto você pode economizar com energia solar
            </h1>
            <p style={{ maxWidth: 680, fontSize: 19, lineHeight: 1.6, color: '#d8e8f5', margin: 0 }}>
              Faça uma estimativa gratuita do sistema ideal para sua casa ou empresa. O resultado também entra automaticamente no atendimento da nossa equipe.
            </p>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 1fr' : 'minmax(0,760px)', gap: 24, justifyContent: 'center', alignItems: 'start' }}>
          <form onSubmit={handleSubmit} style={{ background: '#fff', color: '#172033', borderRadius: 24, padding: 28, boxShadow: '0 22px 70px rgba(0,0,0,.25)' }}>
            <h2 style={{ marginTop: 0, fontSize: 28 }}>Simule agora</h2>
            <p style={{ color: '#5f6b7a', marginTop: -8 }}>Preencha os dados abaixo. Leva menos de um minuto.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
              <Field label="Nome completo" name="name" value={form.name} onChange={update} required />
              <Field label="WhatsApp" name="phone" value={form.phone} onChange={update} placeholder="(14) 99999-9999" required />
              <Field label="E-mail" name="email" value={form.email} onChange={update} type="email" />
              <CityField label="Cidade" name="city" value={form.city} onChange={update} required />
              <Field label="Concessionária" name="utilityCompany" value={form.utilityCompany} onChange={update} />
              <label style={labelStyle}>
                Tipo de ligação
                <select name="connectionType" value={form.connectionType} onChange={update} style={inputStyle}>
                  <option value="monofasica">Monofásica</option>
                  <option value="bifasica">Bifásica</option>
                  <option value="trifasica">Trifásica</option>
                </select>
              </label>
            </div>

            <label style={{ ...labelStyle, marginTop: 16 }}>
              Valor médio da conta de energia
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 16, top: 14, color: '#5f6b7a', fontWeight: 700 }}>R$</span>
                <input name="monthlyBill" value={form.monthlyBill} onChange={update} type="number" min="1" step="0.01" required style={{ ...inputStyle, paddingLeft: 48, fontSize: 20, fontWeight: 800 }} placeholder="500,00" />
              </div>
            </label>

            {error && <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: '#fee2e2', color: '#991b1b', fontWeight: 700 }}>{error}</div>}

            <button disabled={loading} type="submit" style={{ width: '100%', border: 0, borderRadius: 14, padding: '16px 20px', marginTop: 22, fontWeight: 900, fontSize: 17, background: loading ? '#94a3b8' : '#f7c948', color: '#10233c', cursor: loading ? 'wait' : 'pointer' }}>
              {loading ? 'Calculando...' : 'Calcular minha economia'}
            </button>
            <p style={{ textAlign: 'center', color: '#6b7280', fontSize: 12, marginBottom: 0 }}>Estimativa inicial. O projeto final depende de análise técnica e da conta de energia.</p>
          </form>

          {result && (
            <aside style={{ background: 'rgba(255,255,255,.97)', color: '#172033', borderRadius: 24, padding: 28, boxShadow: '0 22px 70px rgba(0,0,0,.25)' }}>
              <div style={{ display: 'inline-block', background: '#dcfce7', color: '#166534', borderRadius: 999, padding: '7px 12px', fontWeight: 800, fontSize: 13 }}>SIMULAÇÃO CONCLUÍDA</div>
              <h2 style={{ fontSize: 30, marginBottom: 6 }}>Seu sistema estimado</h2>
              <p style={{ color: '#64748b', marginTop: 0 }}>Uma proposta preliminar já foi criada no ERP para acompanhamento.</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '22px 0' }}>
                <Metric title="Potência" value={`${number.format(result.system_power_kw)} kWp`} />
                <Metric title="Módulos" value={`${result.panel_count} × ${result.panel_power_w} W`} />
                <Metric title="Geração mensal" value={`${number.format(result.monthly_generation_kwh)} kWh`} />
                <Metric title="Consumo estimado" value={`${number.format(result.estimated_consumption_kwh)} kWh`} />
              </div>

              <div style={{ borderRadius: 18, padding: 20, background: '#effaf6', border: '1px solid #bbf7d0' }}>
                <div style={{ color: '#166534', fontWeight: 800 }}>Economia estimada</div>
                <div style={{ fontSize: 34, fontWeight: 950, color: '#065f46', marginTop: 4 }}>{money.format(result.estimated_monthly_savings)}<span style={{ fontSize: 15 }}>/mês</span></div>
                <div style={{ color: '#166534', marginTop: 5 }}>{money.format(result.estimated_annual_savings)} por ano</div>
              </div>

              <div style={{ marginTop: 18, color: '#475569' }}>
                Faixa preliminar de investimento: <strong>{money.format(result.estimated_investment_min)} a {money.format(result.estimated_investment_max)}</strong>
              </div>

              <a href={whatsappLink} target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', borderRadius: 14, padding: '16px 20px', marginTop: 22, fontWeight: 900, background: '#16a34a', color: '#fff' }}>
                Falar com a MM Energia Solar
              </a>
            </aside>
          )}
        </div>
      </section>
    </main>
  );
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box', marginTop: 7, border: '1px solid #cbd5e1', borderRadius: 12,
  padding: '13px 14px', background: '#fff', color: '#172033', fontSize: 15, outline: 'none',
};
const labelStyle = { display: 'block', fontWeight: 800, fontSize: 14, color: '#334155' };

function Field({ label, ...props }) {
  return <label style={labelStyle}>{label}<input {...props} style={inputStyle} /></label>;
}

function CityField({ label, ...props }) {
  return <label style={labelStyle}>{label}<SaoPauloCitySelect {...props} style={inputStyle} /></label>;
}

function Metric({ title, value }) {
  return <div style={{ padding: 14, borderRadius: 14, background: '#f8fafc', border: '1px solid #e2e8f0' }}><div style={{ fontSize: 12, color: '#64748b', fontWeight: 800 }}>{title}</div><div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>{value}</div></div>;
}
