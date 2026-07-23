import React from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, MessageCircle, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';

const ContactPage = () => {
  return (
    <>
      <Helmet>
        <title>Contato - MM Energia Solar</title>
        <meta name="description" content="Entre em contato com a MM Energia Solar para solicitar orçamento ou tirar dúvidas sobre energia solar fotovoltaica." />
      </Helmet>

      <div className="min-h-screen flex flex-col">
        <Header />

        <main className="flex-grow py-20 bg-background">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground" style={{letterSpacing: '-0.02em'}}>
                Fale Conosco
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Entre em contato para solicitar um orçamento personalizado ou tirar suas dúvidas sobre energia solar. Nossa equipe está pronta para atendê-lo.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl">Informações de Contato</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-start gap-4">
                    <Mail className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-1">Email</h3>
                      <a 
                        href="mailto:contato@mmenergiasolar.com.br"
                        className="text-muted-foreground hover:text-primary transition-colors duration-200 hover:underline"
                      >
                        contato@mmenergiasolar.com.br
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <MessageCircle className="w-6 h-6 text-accent mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-1">WhatsApp</h3>
                      <a 
                        href="https://wa.me/5514998641415"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-accent transition-colors duration-200 hover:underline"
                      >
                        (14) 99864-1415
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <MapPin className="w-6 h-6 text-secondary mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-1">Atendimento</h3>
                      <p className="text-muted-foreground">
                        Atendemos toda a região de Bauru e cidades vizinhas
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-border">
                    <Button 
                      asChild
                      size="lg"
                      className="w-full transition-all duration-200 active:scale-[0.98]"
                    >
                      <a 
                        href="https://wa.me/5514998641415"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2"
                      >
                        <MessageCircle className="w-5 h-5" />
                        Iniciar Conversa no WhatsApp
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default ContactPage;