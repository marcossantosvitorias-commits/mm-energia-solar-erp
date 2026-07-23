import React from 'react';
import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

const faqs = [
  {
    question: "Quanto posso economizar na minha conta de luz?",
    answer: "Um sistema de energia solar bem dimensionado pode reduzir sua conta de luz em até 95%. Você continuará pagando apenas a taxa de disponibilidade da rede elétrica (taxa mínima) e a iluminação pública. A economia exata depende do seu consumo atual e do espaço disponível para instalação dos painéis."
  },
  {
    question: "Qual o tempo de retorno do investimento (ROI)?",
    answer: "Em média, o retorno do investimento em energia solar no Brasil ocorre entre 3 a 5 anos para sistemas residenciais, e de 3 a 7 anos para sistemas comerciais. Como os equipamentos têm vida útil superior a 25 anos, você terá mais de duas décadas de energia praticamente gratuita após o sistema se pagar."
  },
  {
    question: "A energia solar funciona em dias nublados ou chuvosos?",
    answer: "Sim! Os painéis solares geram energia a partir da luminosidade (radiação UV), não do calor. Mesmo em dias nublados ou chuvosos, o sistema continua produzindo energia, embora em menor quantidade do que em um dia ensolarado. O dimensionamento feito pela nossa engenharia já considera as variações climáticas da sua região."
  },
  {
    question: "Como solicitar um orçamento com a MM Energia Solar?",
    answer: "É muito simples! Basta entrar em contato conosco pelo WhatsApp ou preencher o formulário na nossa página de 'Calculadora'. Precisaremos apenas de uma foto da sua última conta de luz para analisar seu histórico de consumo e elaborar um estudo de viabilidade totalmente gratuito e sem compromisso."
  }
];

const FAQSection = () => {
  return (
    <section className="py-24 bg-muted/30 border-t border-border">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Dúvidas Frequentes
          </h2>
          <p className="text-lg text-muted-foreground">
            Tudo o que você precisa saber antes de investir em energia solar fotovoltaica.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-card rounded-2xl border border-border p-6 md:p-8 shadow-sm"
        >
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left font-semibold text-lg hover:text-primary transition-colors">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base leading-relaxed pt-2 pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-10 pt-8 border-t border-border text-center">
            <p className="text-foreground font-medium mb-4">Ainda tem alguma dúvida?</p>
            <Button asChild variant="outline" className="rounded-full">
              <a href="https://wa.me/5514998641415" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-4 h-4 mr-2" />
                Falar com um Especialista
              </a>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;