import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import ObraRealizadaCard from '@/components/ObraRealizadaCard.jsx';

const images = [
  "https://horizons-cdn.hostinger.com/04923e11-ad0d-413c-955e-8170cbc539a2/54aa4fddff6f869cf16341ea0999a250.png",
  "https://horizons-cdn.hostinger.com/04923e11-ad0d-413c-955e-8170cbc539a2/b1ee33023ef863e843ec256c7e03cd18.png",
  "https://horizons-cdn.hostinger.com/04923e11-ad0d-413c-955e-8170cbc539a2/135ab17cfec43d8e705a99bcb319e870.png",
  "https://horizons-cdn.hostinger.com/04923e11-ad0d-413c-955e-8170cbc539a2/e949458c4b4c7eb8d9115828cff47fda.png",
  "https://horizons-cdn.hostinger.com/04923e11-ad0d-413c-955e-8170cbc539a2/82ae1aada16a329e402dfef10b5984df.png",
  "https://horizons-cdn.hostinger.com/04923e11-ad0d-413c-955e-8170cbc539a2/52573f8273478d42cfe09b95cca259af.png",
  "https://horizons-cdn.hostinger.com/04923e11-ad0d-413c-955e-8170cbc539a2/7d1b78b37509c29095c1050090cf8f48.png",
  "https://horizons-cdn.hostinger.com/04923e11-ad0d-413c-955e-8170cbc539a2/0f0d15bcdc1f20bfc18b4b27b7944501.png",
  "https://horizons-cdn.hostinger.com/04923e11-ad0d-413c-955e-8170cbc539a2/c4a0f0fda24a175cea426d5f26001f5f.png"
];

const ObrasRealizadasPage = () => {
  return (
    <>
      <Helmet>
        <title>Obras Realizadas - MM Energia Solar</title>
        <meta name="description" content="Confira as fotos das nossas instalações de energia solar realizadas em residências e empresas." />
      </Helmet>

      <div className="min-h-screen flex flex-col">
        <Header />

        <main className="flex-grow py-20 bg-muted/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground" style={{letterSpacing: '-0.02em'}}>
                  Obras Realizadas
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Confira as fotos das nossas instalações com o padrão de qualidade MM Energia Solar.
                </p>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {images.map((image, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                >
                  <ObraRealizadaCard image={image} />
                </motion.div>
              ))}
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default ObrasRealizadasPage;