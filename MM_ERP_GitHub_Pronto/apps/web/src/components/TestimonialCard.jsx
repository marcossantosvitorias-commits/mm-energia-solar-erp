import React from 'react';
import { Star, Quote } from 'lucide-react';

const TestimonialCard = ({ quote, name, location, rating = 5 }) => {
  return (
    <div className="flex flex-col h-full bg-card rounded-2xl p-8 shadow-sm border border-border hover-lift relative overflow-hidden group">
      <Quote className="absolute top-6 right-6 w-12 h-12 text-primary/5 transition-transform duration-500 group-hover:scale-110 group-hover:text-primary/10" />
      
      <div className="flex gap-1 mb-6">
        {[...Array(rating)].map((_, i) => (
          <Star key={i} className="w-5 h-5 fill-secondary text-secondary" />
        ))}
      </div>
      
      <blockquote className="flex-grow">
        <p className="text-muted-foreground text-lg leading-relaxed italic relative z-10">
          "{quote}"
        </p>
      </blockquote>
      
      <div className="mt-8 pt-6 border-t border-border flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
          {name.charAt(0)}
        </div>
        <div>
          <p className="font-semibold text-foreground">{name}</p>
          <p className="text-sm text-muted-foreground">{location}</p>
        </div>
      </div>
    </div>
  );
};

export default TestimonialCard;