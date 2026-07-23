import React from 'react';

function FinanceTable({ columns, rows, emptyText }) {
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
            rows.map((linha) => (
              <tr key={linha.id}>
                {columns.map((coluna) => (
                  <td key={coluna.key}>{coluna.render(linha)}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default FinanceTable;
