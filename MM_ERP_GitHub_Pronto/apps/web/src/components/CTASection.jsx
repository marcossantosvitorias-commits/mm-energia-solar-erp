import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';

const CTASection = ({ title, description, buttonText, buttonLink }) => {
  return (
    <section className="py-20 bg-gradient-to-br from-primary to-primary/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
          {title}
        </h2>
        {description && (
          <p className="text-lg text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            {description}
          </p>
        )}
        <Button 
          asChild
          size="lg"
          variant="secondary"
          className="transition-all duration-200 active:scale-[0.98] text-lg px-8 py-6"
        >
          <a 
            href={buttonLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            {buttonText}
          </a>
        </Button>
      </div>
    </section>
  );
};

export default CTASection;