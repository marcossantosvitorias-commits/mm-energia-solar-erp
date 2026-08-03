import React from 'react';
import { SAO_PAULO_CITIES } from '../data/saoPauloCities.js';

export default function SaoPauloCitySelect({
  value,
  placeholder = 'Selecione a cidade',
  children,
  ...props
}) {
  const currentValue = String(value || '');
  const valueIsInList = !currentValue || SAO_PAULO_CITIES.includes(currentValue);

  return (
    <select value={currentValue} {...props}>
      <option value="">{placeholder}</option>
      {!valueIsInList && <option value={currentValue}>{currentValue}</option>}
      {SAO_PAULO_CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
      {children}
    </select>
  );
}
