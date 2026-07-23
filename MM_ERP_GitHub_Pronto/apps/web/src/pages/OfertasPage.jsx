import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';

const OfertasPage = () => {
  return (
    <>
      <Helmet>
        <title>Ofertas Especiais - MM Energia Solar</title>
        <meta name="description" content="Confira nossas ofertas especiais em sistemas de energia solar." />
      </Helmet>

      <div className="min-h-screen flex flex-col">
        <Header />

        <main className="flex-grow bg-background flex items-center justify-center p-4">
          <div className="w-full max-w-[1920px] aspect-video bg-muted border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center p-8">
            <h2 className="text-2xl md:text-4xl font-bold text-muted-foreground mb-4">
              Espaço para Banner de Ofertas
            </h2>
            <p className="text-muted-foreground max-w-lg">
              Insira aqui a imagem do seu banner promocional. O tamanho recomendado é 1920x1080 pixels.
              Você pode substituir este bloco pelo elemento de imagem quando a arte estiver pronta.
            </p>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default OfertasPage;