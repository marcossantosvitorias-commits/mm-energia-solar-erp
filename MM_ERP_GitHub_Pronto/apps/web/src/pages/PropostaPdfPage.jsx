import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, MessageCircle, Printer } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import MonthlyGenerationChart from '../components/solar/MonthlyGenerationChart.jsx';
import { getSalesProposal, markProposalAsSent } from '../services/proposalManagementService.js';
import { canShareProposalPdf, downloadProposalPdf, generateProfessionalProposalPdf, whatsappUrl } from '../services/professionalProposalPdfService.js';
import './proposta-pdf.css';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

export default function PropostaPdfPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    getSalesProposal(id).then((data) => active && setProposal(data)).catch((error) => active && setMessage(error.message)).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);

  const finalAmount = useMemo(() => proposal ? Math.max(0, Number(proposal.total_amount || 0) - Number(proposal.discount_amount || 0)) : 0, [proposal]);
  const validityDate = useMemo(() => { if (!proposal) return ''; const date = new Date(proposal.created_at); date.setDate(date.getDate() + Number(proposal.validity_days || 7)); return date.toLocaleDateString('pt-BR'); }, [proposal]);
  const estimatedConsumption = useMemo(() => Number(proposal?.estimated_consumption_kwh || proposal?.monthly_generation_kwh || 0), [proposal]);
  const printProposal = () => window.print();
  const downloadPdf = async () => {
    if (!proposal) return;
    try {
      downloadProposalPdf(await generateProfessionalProposalPdf(proposal));
      setMessage('PDF profissional completo gerado com todas as páginas.');
    } catch (error) { setMessage(error.message || 'Não foi possível gerar o PDF.'); }
  };

  const sendWhatsApp = async () => {
    if (!proposal) return;
    try {
      const text = [`Olá, ${proposal.client_name}!`, 'Sua proposta personalizada da MM Energia Solar está pronta.', `Sistema: ${proposal.panel_count || 0} módulos, ${number.format(proposal.system_power_kw || 0)} kWp.`, `Investimento: ${money.format(finalAmount)}.`, `Proposta válida até ${validityDate}.`].join('\n');
      const file = await generateProfessionalProposalPdf(proposal);
      if (canShareProposalPdf(file)) {
        await navigator.share({ title: file.name, text, files: [file] });
        const updated = await markProposalAsSent(proposal.id); setProposal(updated);
        setMessage('PDF completo anexado. Escolha o WhatsApp Business e depois o contato.');
        return;
      }
      downloadProposalPdf(file);
      window.location.assign(whatsappUrl(proposal.phone, `${text}\n\nO PDF completo foi baixado no aparelho. Anexe-o nesta conversa.`));
      const updated = await markProposalAsSent(proposal.id); setProposal(updated);
      setMessage('O PDF completo foi baixado. Anexe-o na conversa do WhatsApp Business que será aberta.');
    } catch (error) { setMessage(error?.name === 'AbortError' ? 'Compartilhamento cancelado.' : error.message || 'Não foi possível compartilhar o PDF.'); }
  };

  if (loading) return <main className="proposal-loading">Carregando proposta...</main>;
  if (!proposal) return <main className="proposal-loading">{message || 'Proposta não encontrada.'}</main>;

  return <main className="proposal-screen">
    <div className="proposal-toolbar no-print"><button onClick={() => navigate('/app/propostas')}><ArrowLeft size={18} /> Voltar</button><div><button onClick={sendWhatsApp}><MessageCircle size={18} /> Enviar PDF no WhatsApp</button><button className="primary" onClick={downloadPdf}><Download size={18} /> Salvar PDF completo</button><button onClick={printProposal}><Printer size={18} /> Imprimir</button></div></div>
    {message && <p className="proposal-alert no-print">{message}</p>}
    <article className="proposal-document">
      <header className="proposal-cover">
        <div className="proposal-brand"><img src="/logo-mm.png" alt="MM Energia Solar" /><div><strong>MM Energia Solar</strong><span>Projetos fotovoltaicos completos</span></div></div>
        <div className="proposal-title"><span>PROPOSTA COMERCIAL</span><h1>Energia solar feita sob medida para você</h1><p>Economia, segurança e acompanhamento em todas as etapas do seu projeto.</p></div>
        <div className="proposal-client-card"><div><span>Cliente</span><strong>{proposal.client_name}</strong></div><div><span>Cidade</span><strong>{proposal.city || 'Não informada'}</strong></div><div><span>Data</span><strong>{new Date(proposal.created_at).toLocaleDateString('pt-BR')}</strong></div><div><span>Validade</span><strong>{validityDate}</strong></div></div>
      </header>

      <section className="proposal-section">
        <div className="section-heading"><span>01</span><div><h2>Sistema recomendado</h2><p>Dimensionamento preliminar elaborado para o perfil informado.</p></div></div>
        <div className="proposal-metrics"><Metric label="Potência instalada" value={`${number.format(proposal.system_power_kw || 0)} kWp`} /><Metric label="Quantidade de módulos" value={`${proposal.panel_count || 0} unidades`} /><Metric label="Potência dos módulos" value={`${proposal.panel_power_w || 0} W`} /><Metric label="Geração média mensal" value={`${number.format(proposal.monthly_generation_kwh || 0)} kWh`} /></div>
        <div className="equipment-grid"><div><span>Módulos fotovoltaicos</span><strong>{proposal.panel_model || 'Módulos solares de alta eficiência'}</strong></div><div><span>Inversor</span><strong>{proposal.inverter_model || 'Inversor dimensionado para o sistema'}</strong></div></div>
      </section>

      <section className="proposal-section soft">
        <div className="section-heading"><span>02</span><div><h2>Produção de energia durante o ano</h2><p>Estimativa sazonal de janeiro a dezembro, mantendo a geração anual calculada para o sistema.</p></div></div>
        <MonthlyGenerationChart monthlyAverage={proposal.monthly_generation_kwh || 0} consumption={estimatedConsumption} />
      </section>

      <section className="proposal-section">
        <div className="section-heading"><span>03</span><div><h2>O que está incluso</h2><p>Solução completa, da análise inicial à entrega do sistema em funcionamento.</p></div></div>
        <div className="included-grid">{['Projeto e dimensionamento', 'Equipamentos fotovoltaicos', 'Estrutura de fixação', 'Proteções elétricas', 'Instalação especializada', 'Homologação na concessionária', 'Configuração do monitoramento', 'Pós-venda MM Energia Solar'].map((item) => <div key={item}>✓ {item}</div>)}</div>
        {proposal.notes && <div className="proposal-notes"><strong>Observações do projeto</strong><p>{proposal.notes}</p></div>}
      </section>

      <section className="proposal-section investment-section">
        <div className="section-heading"><span>04</span><div><h2>Investimento</h2><p>Condição comercial preparada para este projeto.</p></div></div>
        <div className="investment-card">{Number(proposal.discount_amount || 0) > 0 && <div className="old-price"><span>Valor original</span><strong>{money.format(proposal.total_amount || 0)}</strong></div>}<div className="final-price"><span>Investimento final</span><strong>{money.format(finalAmount)}</strong></div><div className="payment-line"><span>Forma de pagamento</span><strong>{proposal.payment_method || 'À vista'}</strong></div>{proposal.installment_count && <div className="installment-line">{proposal.installment_count}x de <strong>{money.format(proposal.installment_amount || (finalAmount / proposal.installment_count))}</strong></div>}</div>
      </section>

      <section className="proposal-section guarantee-section">
        <div className="section-heading"><span>05</span><div><h2>Compromisso MM Energia Solar</h2><p>Seu projeto acompanhado por uma empresa da região.</p></div></div>
        <div className="guarantee-grid"><div><strong>Atendimento próximo</strong><p>Suporte antes, durante e depois da instalação.</p></div><div><strong>Instalação profissional</strong><p>Execução cuidadosa e organizada na propriedade.</p></div><div><strong>Economia de longo prazo</strong><p>Sistema dimensionado para reduzir os gastos com energia.</p></div></div>
      </section>

      <footer className="proposal-footer"><img src="/logo-mm.png" alt="MM Energia Solar" /><div><strong>MM Energia Solar</strong><span>Bauru e região · Atendimento residencial e empresarial</span></div><div className="proposal-code">Proposta {String(proposal.id).slice(0, 8).toUpperCase()}</div></footer>
    </article>
  </main>;
}

function Metric({ label, value }) { return <div className="proposal-metric"><span>{label}</span><strong>{value}</strong></div>; }
