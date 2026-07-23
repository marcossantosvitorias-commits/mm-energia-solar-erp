import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';

const PrivacyPolicyPage = () => {
  return (
    <>
      <Helmet>
        <title>Política de Privacidade - MM Energia Solar</title>
        <meta name="description" content="Política de privacidade da MM Energia Solar. Saiba como protegemos e utilizamos seus dados pessoais." />
      </Helmet>

      <div className="min-h-screen flex flex-col">
        <Header />

        <main className="flex-grow py-20 bg-background">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-8 text-foreground" style={{letterSpacing: '-0.02em'}}>
                Política de Privacidade
              </h1>

              <div className="prose prose-lg max-w-none">
                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4 text-foreground">1. Coleta de Informações</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    A MM Energia Solar coleta informações pessoais fornecidas voluntariamente por você ao entrar em contato conosco através de nossos canais de atendimento, incluindo nome, email, telefone e endereço. Essas informações são utilizadas exclusivamente para prestação de serviços e comunicação relacionada aos nossos produtos e soluções em energia solar.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4 text-foreground">2. Uso das Informações</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    As informações coletadas são utilizadas para:
                  </p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                    <li>Elaborar orçamentos personalizados de sistemas de energia solar</li>
                    <li>Realizar o acompanhamento de projetos e instalações</li>
                    <li>Prestar suporte técnico e atendimento ao cliente</li>
                    <li>Enviar informações sobre nossos serviços e novidades do setor</li>
                    <li>Cumprir obrigações legais e regulatórias</li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4 text-foreground">3. Proteção de Dados</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações pessoais contra acesso não autorizado, alteração, divulgação ou destruição. Seus dados são armazenados em servidores seguros e o acesso é restrito apenas a colaboradores autorizados que necessitam dessas informações para desempenhar suas funções.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4 text-foreground">4. Compartilhamento de Informações</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros para fins de marketing. Podemos compartilhar dados apenas quando necessário para:
                  </p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                    <li>Prestação de serviços por parceiros técnicos (instaladores, fornecedores de equipamentos)</li>
                    <li>Cumprimento de obrigações legais ou regulatórias</li>
                    <li>Proteção de nossos direitos e propriedade</li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4 text-foreground">5. Seus Direitos</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a:
                  </p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                    <li>Acessar seus dados pessoais que mantemos</li>
                    <li>Solicitar correção de dados incompletos, inexatos ou desatualizados</li>
                    <li>Solicitar a exclusão de seus dados pessoais</li>
                    <li>Revogar seu consentimento para uso de dados</li>
                    <li>Solicitar a portabilidade de seus dados</li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4 text-foreground">6. Cookies e Tecnologias Similares</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Nosso site pode utilizar cookies e tecnologias similares para melhorar sua experiência de navegação, analisar o tráfego e personalizar conteúdo. Você pode configurar seu navegador para recusar cookies, mas isso pode afetar algumas funcionalidades do site.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4 text-foreground">7. Alterações nesta Política</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Reservamos o direito de atualizar esta Política de Privacidade periodicamente. Quaisquer alterações serão publicadas nesta página com a data de atualização. Recomendamos que você revise esta política regularmente para se manter informado sobre como protegemos suas informações.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4 text-foreground">8. Contato</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Se você tiver dúvidas sobre esta Política de Privacidade ou sobre como tratamos seus dados pessoais, entre em contato conosco:
                  </p>
                  <p className="text-muted-foreground leading-relaxed mb-2">
                    <span className="font-medium text-foreground">Email:</span> contato@mmenergiasolar.com.br
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    <span className="font-medium text-foreground">WhatsApp:</span> (14) 99864-1415
                  </p>
                </section>

                <p className="text-sm text-muted-foreground mt-12">
                  Última atualização: {new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </motion.div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default PrivacyPolicyPage;