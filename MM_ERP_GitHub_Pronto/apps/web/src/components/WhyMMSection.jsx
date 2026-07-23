import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Shield, Smartphone, Award } from 'lucide-react';

const features = [
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Maior Eficiência",
    description: "Com a tecnologia APsystems, cada painel opera de forma independente. Sombra em uma placa não afeta a geração das outras.",
    color: "text-secondary",
    bgColor: "bg-secondary/10"
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "Mais Segurança",
    description: "A utilização de microinversores reduz a tensão de corrente contínua no telhado, eliminando riscos de arco elétrico e incêndios.",
    color: "text-primary",
    bgColor: "bg-primary/10"
  },
  {
    icon: <Smartphone className="w-6 h-6" />,
    title: "Monitoramento Inteligente",
    description: "Acompanhe a geração de energia em tempo real, painel por painel, diretamente na palma da sua mão pelo aplicativo do celular.",
    color: "text-accent",
    bgColor: "bg-accent/10"
  },
  {
    icon: <Award className="w-6 h-6" />,
    title: "Maior Durabilidade",
    description: "Equipamentos premium com garantia estendida de fábrica, assegurando a tranquilidade do seu investimento por décadas.",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10"
  }
];

const WhyMMSection = () => {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:w-1/3"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground leading-tight">
              Por que escolher a MM Energia Solar?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Trabalhamos com o que há de mais moderno no mercado mundial: a tecnologia de microinversores APsystems. Isso significa mais segurança, eficiência e durabilidade para o seu projeto.
            </p>
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-muted border border-border font-medium text-sm">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
              Parceiro Oficial APsystems
            </div>
          </motion.div>

          <div className="lg:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-card p-6 rounded-2xl border border-border shadow-sm hover-lift"
              >
                <div className={`w-12 h-12 rounded-xl ${feature.bgColor} ${feature.color} flex items-center justify-center mb-6`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
};

export default WhyMMSection;