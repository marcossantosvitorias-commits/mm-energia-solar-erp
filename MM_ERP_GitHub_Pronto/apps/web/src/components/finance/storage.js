export function carregarDados(chave, valorPadrao) {
  try {
    const dados = localStorage.getItem(chave);
    return dados ? JSON.parse(dados) : valorPadrao;
  } catch {
    return valorPadrao;
  }
}

export function salvarDados(chave, dados) {
  localStorage.setItem(chave, JSON.stringify(dados));
}

export function gerarId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function dataHoje() {
  return new Date().toISOString().slice(0, 10);
}

export function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor || 0));
}

export function formatarData(data) {
  if (!data) return '-';
  return new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR');
}

export function exportarCSV(nomeArquivo, linhas) {
  if (!linhas.length) {
    alert('Não há dados para exportar.');
    return;
  }

  const colunas = Object.keys(linhas[0]);
  const escapar = (valor) => {
    const texto = String(valor ?? '').replace(/"/g, '""');
    return `"${texto}"`;
  };

  const conteudo = [
    colunas.map(escapar).join(';'),
    ...linhas.map((linha) =>
      colunas.map((coluna) => escapar(linha[coluna])).join(';')
    ),
  ].join('\n');

  const blob = new Blob(['\ufeff', conteudo], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = nomeArquivo;
  link.click();

  URL.revokeObjectURL(url);
}
