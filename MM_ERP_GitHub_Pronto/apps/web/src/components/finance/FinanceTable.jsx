import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const CONTAS_MAIRA = [
  { descricao: 'Ótica', parcela: '1/3', valor: 66.68 },
  { descricao: 'Lavacar', parcela: '', valor: 100.00 },
  { descricao: 'Mecânica Robson', parcela: '2x', valor: 165.00 },
  { descricao: 'Azul', parcela: '3/10', valor: 56.99 },
  { descricao: 'Mercado Livre', parcela: '4/5', valor: 55.80 },
  { descricao: 'Curso', parcela: '6/10', valor: 89.70 },
  { descricao: 'Mercado Livre', parcela: '10/12', valor: 100.00 },
  { descricao: 'Pintura', parcela: '', valor: 67.13 },
  { descricao: 'Sala', parcela: '1/3', valor: 131.67 },
];

const moeda = (valor) => Number(valor || 0).toLocaleString('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function FinanceTable({ columns, rows, emptyText }) {
  const [linhasAbertas, setLinhasAbertas] = useState({});
  const totalMaira = useMemo(
    () => CONTAS_MAIRA.reduce((total, item) => total + item.valor, 0),
    []
  );

  const alternarLinha = (id) => {
    setLinhasAbertas((atuais) => ({ ...atuais, [id]: !atuais[id] }));
  };

  const ehMaira = (linha) => String(linha?.descricao || '').trim().toLowerCase() === 'maira';

  return (
    <div className="finance-table-wrapper">
      <table className="finance-table">
        <thead>
          <tr>
            {columns.map((coluna) => (
              <th key={coluna.key}>{coluna.label}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="finance-empty-cell" colSpan={columns.length}>
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((linha) => {
              const maira = ehMaira(linha);
              const aberta = Boolean(linhasAbertas[linha.id]);

              return (
                <React.Fragment key={linha.id}>
                  <tr>
                    {columns.map((coluna) => (
                      <td key={coluna.key}>
                        {maira && coluna.key === 'descricao' ? (
                          <button
                            type="button"
                            onClick={() => alternarLinha(linha.id)}
                            aria-expanded={aberta}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 8,
                              border: 0,
                              background: 'transparent',
                              padding: 0,
                              font: 'inherit',
                              fontWeight: 700,
                              color: 'inherit',
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            <span>{coluna.render(linha)}</span>
                            {aberta ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </button>
                        ) : coluna.render(linha)}
                      </td>
                    ))}
                  </tr>

                  {maira && aberta && (
                    <tr>
                      <td colSpan={columns.length} style={{ padding: 0 }}>
                        <div style={{
                          margin: '8px 12px 14px',
                          padding: 14,
                          borderRadius: 12,
                          background: '#f8fafc',
                          border: '1px solid #dbe4ee',
                        }}>
                          <div style={{ display: 'grid', gap: 8 }}>
                            {CONTAS_MAIRA.map((item, index) => (
                              <div
                                key={`${item.descricao}-${index}`}
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'minmax(0, 1fr) auto auto',
                                  alignItems: 'center',
                                  gap: 12,
                                  paddingBottom: 8,
                                  borderBottom: '1px solid #e2e8f0',
                                }}
                              >
                                <strong>{item.descricao}</strong>
                                <span style={{ color: '#64748b' }}>{item.parcela || '—'}</span>
                                <strong>{moeda(item.valor)}</strong>
                              </div>
                            ))}
                          </div>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 12,
                            marginTop: 12,
                            paddingTop: 10,
                            borderTop: '2px solid #cbd5e1',
                            fontWeight: 800,
                          }}>
                            <span>Total detalhado</span>
                            <span>{moeda(totalMaira)}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default FinanceTable;
