import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Mail, MessageCircle, Facebook, Instagram } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import LeadForm from '../components/LeadForm';

// --- COMPONENTE HEADER ORIGINAL ---
const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Obras Realizadas', path: '/obras' },
    { name: 'Calculadora', path: '/calculadora' },
    { name: 'Contato', path: '/contato' },
    { name: 'Privacidade', path: '/privacidade' }
  ];

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${isScrolled ? 'bg-white/95 backdrop-blur-sm shadow-md py-2 border-border/50' : 'bg-white py-4 border-border'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center transition-opacity duration-200 hover:opacity-80">
            <img src="https://horizons-cdn.hostinger.com/04923e11-ad0d-413c-955e-8170cbc539a2/5253745aa1f4a206e224312a8cdfdbb5.png" alt="MM Energia Solar" className={`w-auto transition-all duration-300 ${isScrolled ? 'h-10' : 'h-12'}`} />
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link ) => (
              <Link key={link.path} to={link.path} className={`font-medium transition-all duration-300 relative hover:-translate-y-0.5 ${isScrolled ? 'text-sm' : 'text-base'} ${isActive(link.path) ? 'text-primary' : 'text-foreground hover:text-primary'}`}>
                {link.name}
                {isActive(link.path) && <span className="absolute -bottom-[21px] left-0 right-0 h-0.5 bg-primary" />}
              </Link>
            ))}
          </nav>
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild><Button variant="ghost" size="icon">{isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}</Button></SheetTrigger>
              <SheetContent side="right" className="w-[300px]">
                <nav className="flex flex-col gap-6 mt-8">
                  {navLinks.map((link) => (
                    <Link key={link.path} to={link.path} onClick={() => setIsOpen(false)} className={`text-lg font-medium ${isActive(link.path) ? 'text-primary' : 'text-foreground'}`}>{link.name}</Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

// --- COMPONENTE FOOTER ORIGINAL ---
const Footer = () => {
  return (
    <footer className="bg-accent text-accent-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">MM Energia Solar</h3>
            <p className="text-sm leading-relaxed opacity-90">Soluções em energia solar para residências e empresas. Economia, sustentabilidade e qualidade.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Links rápidos</h3>
            <nav className="flex flex-col gap-2">
              <Link to="/" className="text-sm hover:underline opacity-90">Home</Link>
              <Link to="/obras" className="text-sm hover:underline opacity-90">Obras Realizadas</Link>
              <Link to="/calculadora" className="text-sm hover:underline opacity-90">Calculadora</Link>
              <Link to="/contato" className="text-sm hover:underline opacity-90">Contato</Link>
              <Link to="/privacidade" className="text-sm hover:underline opacity-90">Política de Privacidade</Link>
            </nav>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Contato</h3>
            <div className="space-y-3">
              <a href="mailto:contato@mmenergiasolar.com.br" className="flex items-center gap-2 text-sm hover:underline opacity-90"><Mail className="w-4 h-4" />contato@mmenergiasolar.com.br</a>
              <a href="https://wa.me/5514998641415" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:underline opacity-90"><MessageCircle className="w-4 h-4" />(14 ) 99864-1415</a>
            </div>
            <div className="flex gap-4 mt-6">
              <a href="https://web.facebook.com/mmenergiasolarbauru" target="_blank" rel="noopener noreferrer" className="transition-all duration-300 hover:text-primary hover:scale-110"><Facebook className="w-6 h-6" /></a>
              <a href="https://www.instagram.com/mmenergiasolarbauru/" target="_blank" rel="noopener noreferrer" className="transition-all duration-300 hover:text-pink-500 hover:scale-110"><Instagram className="w-6 h-6" /></a>
            </div>
          </div>
        </div>
      </div>
    </footer>
   );
};

// --- PÁGINA DA CALCULADORA ---
const CalculadoraPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Header />
      <div className="pt-24 md:pt-32">
        <section className="bg-gradient-to-br from-blue-900 to-blue-700 py-16 px-4 text-center text-white">
          <div className="max-w-4xl mx-auto">
            <span className="bg-yellow-400 text-black px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">⚡ Simulação Gratuita em 30 Segundos</span>
            <h1 className="text-4xl md:text-5xl font-extrabold mt-6 mb-4 leading-tight">Reduza sua Conta de Luz em até <span className="text-yellow-400">95%</span></h1>
            <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto mb-8">Descubra agora quanto você pode economizar com energia solar e receba um projeto personalizado.</p>
          </div>
        </section>
        <section className="-mt-12 pb-16 px-4">
          <div className="max-w-xl mx-auto"><LeadForm /></div>
        </section>
        <section className="py-16 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Por que escolher a <span className="text-blue-700">MM Energia Solar</span>?</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-slate-50 p-8 rounded-2xl text-center shadow-sm border border-slate-100">
                <div className="text-4xl mb-4">💰</div>
                <h3 className="text-xl font-bold mb-2">Economia Imediata</h3>
                <p className="text-slate-600">Redução drástica nos custos já no primeiro mês após a instalação.</p>
              </div>
              <div className="bg-slate-50 p-8 rounded-2xl text-center shadow-sm border border-slate-100">
                <div className="text-4xl mb-4">🛡️</div>
                <h3 className="text-xl font-bold mb-2">Proteção Tarifária</h3>
                <p className="text-slate-600">Fique imune aos aumentos constantes e bandeiras tarifárias.</p>
              </div>
              <div className="bg-slate-50 p-8 rounded-2xl text-center shadow-sm border border-slate-100">
                <div className="text-4xl mb-4">🏡</div>
                <h3 className="text-xl font-bold mb-2">Valorização Real</h3>
                <p className="text-slate-600">Seu imóvel muito mais atrativo e valorizado no mercado.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default CalculadoraPage;