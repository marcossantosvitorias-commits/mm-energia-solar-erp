import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

const BenefitCard = ({ emoji, title, description }) => {
  return (
    <Card className="border-none shadow-sm bg-muted/50 hover:shadow-md transition-all duration-200">
      <CardContent className="p-6 flex flex-col h-full">
        <div className="text-5xl mb-4">{emoji}</div>
        <h3 className="text-xl font-semibold mb-2 text-foreground">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
};

export default BenefitCard;