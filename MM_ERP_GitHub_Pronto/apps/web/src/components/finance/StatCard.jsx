import React from 'react';

function StatCard({ label, value, helper, tone = 'default' }) {
  return (
    <article className={`finance-stat-card tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </article>
  );
}

export default StatCard;
