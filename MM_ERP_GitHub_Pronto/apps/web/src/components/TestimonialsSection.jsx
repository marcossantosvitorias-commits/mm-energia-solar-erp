import React from 'react';
import { motion } from 'framer-motion';
import TestimonialCard from './TestimonialCard.jsx';

const testimonials = [
  {
    quote: "Investimento fantástico! Minha conta de luz caiu de R$ 850 para apenas o valor da taxa mínima. A equipe da MM Energia Solar foi super profissional desde o orçamento até a instalação final.",
    name: "Rogério Ivan",
    location: "Bauru/SP",
    rating: 5
  },
  {
    quote: "Pesquisei várias empresas antes de fechar negócio e a MM me passou mais confiança. O sistema está gerando exatamente o que foi prometido no projeto. Recomendo de olhos fechados.",
    name: "Ana Paula S.",
    location: "Piratininga/SP",
    rating: 5
  },
  {
    quote: "A tecnologia dos microinversores me chamou muita atenção. Consigo acompanhar a geração de cada placa pelo celular. Instalação rápida, limpa e sem dor de cabeça no meu comércio.",
    name: "Carlos M.",
    location: "Agudos/SP",
    rating: 5
  }
];

const TestimonialsSection = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            O que nossos clientes dizem
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Histórias reais de pessoas que transformaram o sol em economia e valorização do imóvel.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <TestimonialCard {...testimonial} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;