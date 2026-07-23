import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calculator } from 'lucide-react';

const SolarCalculator = () => {
  const [billValue, setBillValue] = useState('');
  const [result, setResult] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculate = () => {
    const value = parseFloat(billValue);
    
    if (!value || value <= 0) {
      return;
    }

    setIsCalculating(true);
    
    setTimeout(() => {
      const sistema = (value / 0.75) / (5.2 * 30);
      setResult(sistema.toFixed(2));
      setIsCalculating(false);
    }, 300);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleCalculate();
    }
  };

  return (
    <Card className="max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Calculator className="w-6 h-6 text-primary" />
          Simule sua Economia
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="bill-value" className="text-sm font-medium text-foreground">
            Valor da conta de luz (R$)
          </label>
          <Input
            id="bill-value"
            type="number"
            placeholder="Ex: 300"
            value={billValue}
            onChange={(e) => setBillValue(e.target.value)}
            onKeyPress={handleKeyPress}
            className="text-lg"
          />
        </div>
        
        <Button 
          onClick={handleCalculate}
          disabled={!billValue || isCalculating}
          className="w-full transition-all duration-200 active:scale-[0.98]"
          size="lg"
        >
          {isCalculating ? 'Calculando...' : 'Calcular Sistema Recomendado'}
        </Button>

        {result && (
          <div className="bg-primary/10 border-2 border-primary rounded-xl p-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">Sistema recomendado:</p>
            <p className="text-4xl font-bold text-primary">{result} kWp</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SolarCalculator;