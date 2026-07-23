import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun, PanelTop, Zap, Home, UtilityPole, Battery } from 'lucide-react';

const FlowDot = ({ direction = "horizontal", color = "bg-secondary", delay = 0 }) => {
  const isHorizontal = direction === "horizontal";
  
  return (
    <motion.div
      className={`absolute rounded-full ${color} ${isHorizontal ? 'w-2 h-2 top-1/2 -translate-y-1/2' : 'w-2 h-2 left-1/2 -translate-x-1/2'}`}
      initial={isHorizontal ? { left: 0, opacity: 0 } : { top: 0, opacity: 0 }}
      animate={isHorizontal ? { left: ["0%", "50%", "100%"], opacity: [0, 1, 0] } : { top: ["0%", "50%", "100%"], opacity: [0, 1, 0] }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "linear",
        delay: delay
      }}
      style={{ boxShadow: '0 0 8px currentColor' }}
    />
  );
};

const NodeItem = ({ icon: Icon, title, description, colorClass, highlight }) => (
  <div className={`relative flex flex-col items-center p-4 rounded-xl border ${highlight ? 'border-primary shadow-md bg-primary/5' : 'border-border bg-card'} z-10 w-32`}>
    <div className={`p-3 rounded-full mb-3 ${colorClass}`}>
      <Icon className="w-8 h-8" />
    </div>
    <h4 className="font-semibold text-sm text-center mb-1 text-foreground">{title}</h4>
    <p className="text-[10px] text-center text-muted-foreground leading-tight">{description}</p>
  </div>
);

const SolarSystemAnimation = () => {
  return (
    <div className="w-full max-w-6xl mx-auto py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Como Funciona Nosso Sistema Solar</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Entenda o fluxo de energia nos dois principais modelos de instalação oferecidos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* On-Grid System */}
        <Card className="border-border shadow-lg">
          <CardHeader className="bg-muted/50 border-b border-border rounded-t-xl">
            <CardTitle className="text-xl text-center text-primary flex items-center justify-center gap-2">
              <Zap className="w-5 h-5" />
              Sistema On-Grid (Conectado)
            </CardTitle>
            <p className="text-sm text-center text-muted-foreground mt-2">
              A energia gerada é usada na casa. O excedente vai para a rede e vira créditos.
            </p>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex flex-col items-center gap-8 relative pt-4">
              <div className="flex items-center justify-between w-full relative">
                <NodeItem 
                  icon={Sun} 
                  title="Sol" 
                  description="Fonte inesgotável" 
                  colorClass="bg-secondary/20 text-secondary" 
                />
                
                <div className="energy-line-horizontal" style={{ width: 'calc(100% - 16rem)', left: '8rem' }}>
                  <FlowDot direction="horizontal" color="bg-secondary" delay={0} />
                  <FlowDot direction="horizontal" color="bg-secondary" delay={0.75} />
                </div>

                <NodeItem 
                  icon={PanelTop} 
                  title="Placas Solares" 
                  description="Captam luz solar" 
                  colorClass="bg-primary/20 text-primary" 
                />
              </div>

              <div className="w-0.5 h-12 bg-border relative">
                <FlowDot direction="vertical" color="bg-primary" delay={0.2} />
              </div>

              <NodeItem 
                icon={Zap} 
                title="Inversor" 
                description="Converte para uso" 
                colorClass="bg-accent/20 text-accent" 
                highlight 
              />

              <div className="w-full flex justify-center mt-4">
                <div className="w-1/2 h-0.5 bg-border relative">
                  <FlowDot direction="horizontal" color="bg-accent" delay={0.4} />
                  <FlowDot direction="horizontal" color="bg-accent" delay={1.15} />
                  
                  {/* Left branch down */}
                  <div className="absolute left-0 top-0 w-0.5 h-12 bg-border">
                    <FlowDot direction="vertical" color="bg-accent" delay={0.8} />
                  </div>
                  
                  {/* Right branch down */}
                  <div className="absolute right-0 top-0 w-0.5 h-12 bg-border">
                    <FlowDot direction="vertical" color="bg-accent" delay={0.8} />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between w-full mt-8">
                <NodeItem 
                  icon={Home} 
                  title="Sua Casa" 
                  description="Consumo imediato" 
                  colorClass="bg-primary/10 text-primary" 
                />
                <NodeItem 
                  icon={UtilityPole} 
                  title="Rede Elétrica" 
                  description="Gera créditos" 
                  colorClass="bg-muted text-muted-foreground" 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hybrid System */}
        <Card className="border-border shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-bl-lg z-20">
            Premium
          </div>
          <CardHeader className="bg-accent/5 border-b border-border rounded-t-xl">
            <CardTitle className="text-xl text-center text-accent flex items-center justify-center gap-2">
              <Battery className="w-5 h-5" />
              Sistema Híbrido (Com Bateria)
            </CardTitle>
            <p className="text-sm text-center text-muted-foreground mt-2">
              Armazena energia para uso à noite ou em caso de queda de luz.
            </p>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex flex-col items-center gap-8 relative pt-4">
              <div className="flex items-center justify-between w-full relative">
                <NodeItem 
                  icon={Sun} 
                  title="Sol" 
                  description="Fonte inesgotável" 
                  colorClass="bg-secondary/20 text-secondary" 
                />
                
                <div className="energy-line-horizontal" style={{ width: 'calc(100% - 16rem)', left: '8rem' }}>
                  <FlowDot direction="horizontal" color="bg-secondary" delay={0} />
                  <FlowDot direction="horizontal" color="bg-secondary" delay={0.75} />
                </div>

                <NodeItem 
                  icon={PanelTop} 
                  title="Placas Solares" 
                  description="Captam luz solar" 
                  colorClass="bg-primary/20 text-primary" 
                />
              </div>

              <div className="w-0.5 h-12 bg-border relative">
                <FlowDot direction="vertical" color="bg-primary" delay={0.2} />
              </div>

              <NodeItem 
                icon={Zap} 
                title="Inversor Híbrido" 
                description="Gerencia fluxos" 
                colorClass="bg-accent/20 text-accent" 
                highlight 
              />

              <div className="w-full flex justify-center mt-4">
                <div className="w-[80%] h-0.5 bg-border relative">
                  <FlowDot direction="horizontal" color="bg-accent" delay={0.4} />
                  
                  {/* Left branch down (Home) */}
                  <div className="absolute left-0 top-0 w-0.5 h-12 bg-border">
                    <FlowDot direction="vertical" color="bg-accent" delay={0.8} />
                  </div>

                  {/* Middle branch down (Battery) */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-0 w-0.5 h-12 bg-border">
                    <FlowDot direction="vertical" color="bg-accent" delay={0.6} />
                  </div>
                  
                  {/* Right branch down (Grid) */}
                  <div className="absolute right-0 top-0 w-0.5 h-12 bg-border">
                    <FlowDot direction="vertical" color="bg-accent" delay={1.0} />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between w-full mt-8">
                <NodeItem 
                  icon={Home} 
                  title="Sua Casa" 
                  description="Consumo contínuo" 
                  colorClass="bg-primary/10 text-primary" 
                />
                <NodeItem 
                  icon={Battery} 
                  title="Bateria" 
                  description="Reserva e Noite" 
                  colorClass="bg-secondary/20 text-secondary" 
                  highlight
                />
                <NodeItem 
                  icon={UtilityPole} 
                  title="Rede" 
                  description="Backup extra" 
                  colorClass="bg-muted text-muted-foreground" 
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SolarSystemAnimation;