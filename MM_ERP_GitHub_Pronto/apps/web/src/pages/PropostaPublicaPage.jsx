import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileCheck2, MessageCircle, ShieldCheck, SunMedium } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { acceptPublicProposal, getPublicProposal } from '../services/publicProposalService.js';
import './proposta-publica.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

export default function PropostaPublicaPage() {
  const { token } = useParams();
  const [proposal, setProposal] = useState(null);
  const [form, setForm] = useState({ name: '', document: '' });
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [message, setMessage] = useState('');
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    let active = true;
    getPublicProposal(token)
      .then((data) => {
        if (!active) return;
        setProposal(data);
        setForm((current) => ({ ...current, name: data.client_name || '' }));
        setAccepted(data.status === 'Aceita');
      })
      .catch((error) => active && setMessage(error.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [token]);

  const finalAmount = useMemo(() => Math.max(0, Number(proposal?.total_amount || 0) - Number(proposal?.discount_amount || 0)), [proposal]);
  const validityDate = useMemo(() => {
    if (!proposal) return '';
    const date = new Date(proposal.created_at);
    date.setDate(date.getDate() + Number(proposal.validity_days || 7));
    return date.toLocaleDateString('pt-BR');
  }, [proposal]);

  const accept = async (event) => {
    event.preventDefault();
    setAccepting(true);
    setMessage('');
    try {
      await acceptPublicProposal(token, form);
      setAccepted(true);
      setProposal((current) => ({ ...current, status: 'Aceita', accepted_at: new Date().toISOString() }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setAccepting(false);
    }
  };

  if (loading) return <main className="public-proposal-state">Carregando sua proposta...</main>;
  if (!proposal) return <main className="public-proposal-state">{message || 'Proposta não encontrada.'}</main>;

  return <main className="public-proposal-page">
    <header className="public-proposal-hero">
      <div className="public-proposal-brand"><img src="/logo-mm.png" alt="MM Energia Solar" /><div><strong>MM Energia Solar</strong><span>Proposta personalizada</span></div></div>
      <div className="public-proposal-hero-content">
        <span className="public-proposal-tag"><SunMedium size={17} /> ENERGIA SOLAR</span>
        <h1>{accepted ? 'Proposta aceita com sucesso!' : `Olá, ${proposal.client_name}`}</h1>
        <p>{accepted ? 'A equipe da MM Energia Solar recebeu sua confirmação e entrará em contato para os próximos passos.' : 'Confira abaixo o sistema recomendado e as condições preparadas especialmente para você.'}</p>
      </div>
    </header>

    <section className="public-proposal-container">
      {accepted && <div className="public-proposal-success"><CheckCircle2 size={34} /><div><strong>Confirmação registrada</strong><p>Seu aceite ficou salvo com data e horário no sistema da MM Energia Solar.</p></div></div>}
      {message && <p className="public-proposal-alert">{message}</p>}

      <div className="public-proposal-grid">
        <article className="public-proposal-card">
          <span className="card-eyebrow">SISTEMA RECOMENDADO</span>
          <h2>{number.format(proposal.system_power_kw || 0)} kWp</h2>
          <div className="public-metrics">
            <Metric label="Módulos" value={`${proposal.panel_count || 0} unidades`} />
            <Metric label="Potência por módulo" value={`${proposal.panel_power_w || 0} W`} />
            <Metric label="Geração mensal" value={`${number.format(proposal.monthly_generation_kwh || 0)} kWh`} />
            <Metric label="Validade" value={`Até ${validityDate}`} />
          </div>
          <div className="public-equipment"><span>Módulos</span><strong>{proposal.panel_model || 'Módulos solares de alta eficiência'}</strong></div>
          <div className="public-equipment"><span>Inversor</span><strong>{proposal.inverter_model || 'Inversor dimensionado para o projeto'}</strong></div>
        </article>

        <article className="public-proposal-card investment">
          <span className="card-eyebrow">INVESTIMENTO</span>
          {Number(proposal.discount_amount || 0) > 0 && <div className="public-old-price">De {money.format(proposal.total_amount || 0)}</div>}
          <div className="public-final-price">{money.format(finalAmount)}</div>
          <p>{proposal.payment_method || 'Pagamento à vista'}</p>
          {proposal.installment_count && <div className="public-installments">{proposal.installment_count}x de <strong>{money.format(proposal.installment_amount || finalAmount / proposal.installment_count)}</strong></div>}
          <div className="public-security"><ShieldCheck size={20} /> Proposta identificada e protegida por link exclusivo.</div>
        </article>
      </div>

      <article className="public-proposal-card included">
        <span className="card-eyebrow">SOLUÇÃO COMPLETA</span>
        <div className="public-included-grid">{['Projeto e dimensionamento', 'Equipamentos fotovoltaicos', 'Estrutura de fixação', 'Proteções elétricas', 'Instalação especializada', 'Homologação', 'Monitoramento', 'Pós-venda'].map((item) => <div key={item}>✓ {item}</div>)}</div>
        {proposal.notes && <div className="public-notes"><strong>Observações</strong><p>{proposal.notes}</p></div>}
      </article>

      {!accepted && proposal.status !== 'Recusada' && <form className="public-acceptance" onSubmit={accept}>
        <FileCheck2 size={30} />
        <div className="public-acceptance-heading"><h2>Aceitar esta proposta</h2><p>Ao confirmar, você registra seu interesse em seguir com a contratação nas condições apresentadas.</p></div>
        <label>Nome completo<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>CPF ou CNPJ <small>(opcional)</small><input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} /></label>
        <label className="public-consent"><input type="checkbox" required /> <span>Li a proposta e concordo em registrar meu aceite para que a MM Energia Solar dê continuidade ao atendimento.</span></label>
        <button disabled={accepting} type="submit">{accepting ? 'Registrando aceite...' : 'Aceitar proposta'}</button>
      </form>}

      <a className="public-whatsapp" href="https://wa.me/5514999999999" target="_blank" rel="noreferrer"><MessageCircle size={20} /> Falar com a MM Energia Solar</a>
    </section>
  </main>;
}

function Metric({ label, value }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
