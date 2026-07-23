import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageCircle, Calculator } from 'lucide-react';
import { motion } from 'framer-motion';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import CTASection from '@/components/CTASection.jsx';
import SolarSystemAnimation from '@/components/SolarSystemAnimation.jsx';
import TestimonialsSection from '@/components/TestimonialsSection.jsx';
import WhyMMSection from '@/components/WhyMMSection.jsx';
import FAQSection from '@/components/FAQSection.jsx';

const HomePage = () => {
  const benefits = [
    {
      emoji: '💰',
      title: 'Economia de até 95%',
      description: 'Reduza drasticamente sua conta de luz e tenha previsibilidade de custos por décadas.'
    },
    {
      emoji: '☀️',
      title: 'Energia limpa e renovável',
      description: 'Contribua para um planeta mais sustentável utilizando energia solar fotovoltaica.'
    },
    {
      emoji: '📈',
      title: 'Valorização do imóvel',
      description: 'Imóveis com energia solar têm maior valor de mercado e atraem mais compradores.'
    },
    {
      emoji: '🔧',
      title: 'Baixa manutenção',
      description: 'Sistemas solares requerem manutenção mínima e têm vida útil superior a 25 anos.'
    },
    {
      emoji: '⚡',
      title: 'Retorno garantido',
      description: 'Investimento com retorno em 3 a 7 anos e economia garantida por mais de 25 anos.'
    }
  ];

  return (
    <>
      <Helmet>
        <title>MM Energia Solar - Energia Solar Inteligente</title>
        <meta
          name="description"
          content="Economize até 95% na conta de luz com energia solar. Projetos personalizados e instalação profissional."
        />
      </Helmet>

      <div className="min-h-screen flex flex-col pt-16">
        <Header />

        <main className="flex-grow">

          {/* HERO */}
          <section className="relative bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground pt-16 pb-24 md:pt-24 md:pb-32 overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=2072&auto=format&fit=crop')] opacity-10 bg-cover bg-center mix-blend-overlay"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                
                <img
                  src="https://horizons-cdn.hostinger.com/04923e11-ad0d-413c-955e-8170cbc539a2/design-sem-nomelogo-IKw31.png"
                  alt="MM Energia Solar"
                  className="h-56 md:h-72 mx-auto mb-6"
                />

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
                  Energia Solar Inteligente para sua Casa ou Empresa
                </h1>

                <p className="text-lg md:text-xl mb-10 max-w-3xl mx-auto text-primary-foreground/90">
                  Economize até 95% na conta de luz com energia limpa e sustentável.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">

                  <Button asChild size="lg" variant="secondary" className="hover-lift">
                    <a href="https://wa.me/5514998641415" target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="mr-2" />
                      Solicitar Orçamento
                    </a>
                  </Button>

                  <Button asChild size="lg" className="hover-lift">
                    <Link to="/calculadora">
                      <Calculator className="mr-2" />
                      Simular Economia
                    </Link>
                  </Button>

                </div>

              </motion.div>
            </div>
          </section>

          {/* SOBRE */}
          <section className="py-24 text-center max-w-3xl mx-auto px-4 sm:px-6">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
                Sobre a MM Energia Solar
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Especialistas em energia solar fotovoltaica com projetos personalizados e instalação profissional. Nosso compromisso é levar a melhor tecnologia em geração de energia renovável para residências e empresas, garantindo o máximo de economia com o mais alto padrão de segurança.
              </p>
            </motion.div>
          </section>

          {/* BENEFÍCIOS */}
          <section className="py-24 bg-muted/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Por que investir em energia solar?</h2>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {benefits.map((b, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, y: 20 }} 
                    whileInView={{ opacity: 1, y: 0 }} 
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="p-8 bg-card rounded-2xl shadow-sm border border-border hover-lift"
                  >
                    <div className="text-5xl mb-6">{b.emoji}</div>
                    <h3 className="text-xl font-bold mb-3">{b.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{b.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* DEPOIMENTOS */}
          <TestimonialsSection />

          {/* POR QUE ESCOLHER MM (DIFERENCIAIS) */}
          <WhyMMSection />

          {/* ANIMAÇÃO */}
          <section className="py-24 bg-background border-t border-border">
            <SolarSystemAnimation />
          </section>

          {/* FOTOS DE OBRAS */}
          <section className="py-24 bg-muted/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Instalações em Destaque</h2>
                <p className="text-lg text-muted-foreground">Qualidade e acabamento impecável em cada detalhe.</p>
              </div>
              <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">

                <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="rounded-2xl overflow-hidden shadow-sm bg-card border border-border hover-lift">
                  <img src="https://horizons-cdn.hostinger.com/04923e11-ad0d-413c-955e-8170cbc539a2/29b0bcf95f3c3d4ca2071d031ce96d89.png" alt="Instalação Residencial MM Energia Solar" className="w-full aspect-video object-cover" />
                  <div className="p-6 md:p-8">
                    <h3 className="text-xl font-bold mb-2">Instalação Residencial</h3>
                    <p className="text-muted-foreground">Sistema de 9.4 kWp instalado em Bauru/SP, dimensionado para suprir 100% do consumo da residência.</p>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="rounded-2xl overflow-hidden shadow-sm bg-card border border-border hover-lift">
                  <img src="https://horizons-cdn.hostinger.com/04923e11-ad0d-413c-955e-8170cbc539a2/62427178b3dade2097e147281023a694.png" alt="Projeto Comercial MM Energia Solar" className="w-full aspect-video object-cover" />
                  <div className="p-6 md:p-8">
                    <h3 className="text-xl font-bold mb-2">Projeto Comercial</h3>
                    <p className="text-muted-foreground">Sistema de 17.6 kWp com tecnologia APsystems, ideal para máxima eficiência e segurança no seu negócio.</p>
                  </div>
                </motion.div>

              </div>
              <div className="text-center mt-12">
                <Button asChild variant="outline" size="lg">
                  <Link to="/obras">Ver todas as obras</Link>
                </Button>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <FAQSection />

          {/* CTA */}
          <CTASection
            title="Pronto para transformar o sol em economia?"
            description="Fale com nossa equipe de especialistas e descubra o melhor projeto para o seu telhado."
            buttonText="Solicitar Orçamento no WhatsApp"
            buttonLink="https://wa.me/5514998641415"
          />

        </main>

        <Footer />
      </div>
    </>
  );
};

export default HomePage;