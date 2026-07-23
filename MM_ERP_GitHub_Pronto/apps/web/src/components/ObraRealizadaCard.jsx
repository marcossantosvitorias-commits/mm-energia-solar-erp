import React from 'react';

const ObraRealizadaCard = ({ image }) => {
  return (
    <div className="w-full overflow-hidden rounded-xl bg-muted shadow-sm border border-border">
      <img 
        src={image} 
        alt="Instalação MM Energia Solar" 
        className="w-full h-full object-cover aspect-[4/5]"
      />
    </div>
  );
};

export default ObraRealizadaCard;