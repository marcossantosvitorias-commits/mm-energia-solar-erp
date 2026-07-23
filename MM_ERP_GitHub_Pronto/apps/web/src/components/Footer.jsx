import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MessageCircle, Facebook, Instagram } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-accent text-accent-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">MM Energia Solar</h3>
            <p className="text-sm leading-relaxed opacity-90">
              Soluções em energia solar para residências e empresas. Economia, sustentabilidade e qualidade.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Links rápidos</h3>
            <nav className="flex flex-col gap-2">
              <Link to="/" className="text-sm hover:underline transition-all duration-200 opacity-90 hover:opacity-100">
                Home
              </Link>
              <Link to="/obras" className="text-sm hover:underline transition-all duration-200 opacity-90 hover:opacity-100">
                Obras Realizadas
              </Link>
              <Link to="/calculadora" className="text-sm hover:underline transition-all duration-200 opacity-90 hover:opacity-100">
                Calculadora
              </Link>
              <Link to="/contato" className="text-sm hover:underline transition-all duration-200 opacity-90 hover:opacity-100">
                Contato
              </Link>
              <Link to="/privacidade" className="text-sm hover:underline transition-all duration-200 opacity-90 hover:opacity-100">
                Política de Privacidade
              </Link>
            </nav>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Contato</h3>
            <div className="space-y-3">
              <a 
                href="mailto:contato@mmenergiasolar.com.br"
                className="flex items-center gap-2 text-sm hover:underline transition-all duration-200 opacity-90 hover:opacity-100"
              >
                <Mail className="w-4 h-4" />
                contato@mmenergiasolar.com.br
              </a>
              <a 
                href="https://wa.me/5514998641415"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm hover:underline transition-all duration-200 opacity-90 hover:opacity-100"
              >
                <MessageCircle className="w-4 h-4" />
                (14) 99864-1415
              </a>
            </div>

            <div className="flex gap-4 mt-6">
              <a 
                href="https://web.facebook.com/mmenergiasolarbauru" 
                target="_blank"
                rel="noopener noreferrer"
                className="transition-all duration-300 hover:text-primary hover:scale-110 active:scale-95"
                aria-label="Facebook"
              >
                <Facebook className="w-6 h-6" />
              </a>
              <a 
                href="https://www.instagram.com/mmenergiasolarbauru/" 
                target="_blank"
                rel="noopener noreferrer"
                className="transition-all duration-300 hover:text-pink-500 hover:scale-110 active:scale-95"
                aria-label="Instagram"
              >
                <Instagram className="w-6 h-6" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-accent-foreground/20 mt-8 pt-8 text-center">
          <p className="text-sm opacity-90">
            © {new Date().getFullYear()} MM Energia Solar. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;