function lerTag(bloco, tag) {
  const resultado = bloco.match(new RegExp(`<${tag}>([^\\r\\n<]+)`, 'i'));
  return resultado?.[1]?.trim() || '';
}

function normalizarNumero(valor) {
  const texto = String(valor || '').trim();
  if (!texto) return 0;

  if (texto.includes(',')) {
    return Number(texto.replace(/\./g, '').replace(',', '.'));
  }

  return Number(texto);
}

function normalizarData(valor) {
  const texto = String(valor || '').trim();

  if (/^\d{8}/.test(texto)) {
    return `${texto.slice(0, 4)}-${texto.slice(4, 6)}-${texto.slice(6, 8)}`;
  }

  const dataBrasileira = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dataBrasileira) {
    return `${dataBrasileira[3]}-${dataBrasileira[2]}-${dataBrasileira[1]}`;
  }

  return texto;
}

function categoriaDoMovimento(descricao, tipo) {
  const texto = descricao.toUpperCase();

  if (texto.includes('FACEBOOK')) return 'Publicidade';
  if (texto.includes('POSTO')) return 'Combustível';
  if (texto.includes('TREVISO') || texto.includes('ENGENHARIA')) return 'Engenharia';
  if (texto.includes('CONTABILIDADE')) return 'Contabilidade';
  if (texto.includes('RECEITA FEDERAL') || texto.includes('TRIBUTO') || texto.includes('DARF') || texto.includes('IOF')) return 'Impostos';
  if (texto.includes('JUROS')) return 'Taxas bancárias';
  if (texto.includes('FOTUS') || texto.includes('PARAFUS')) return 'Fornecedor';
  if (texto.includes('MARCOS OTONIEL') || texto.includes('MANOELA VITORIA')) return 'Retirada da empresa';
  if (texto.includes('RESTAURANTE') || texto.includes('CHURRASCO') || texto.includes('BARDO')) return 'Alimentação';
  if (texto.includes('CONSORCIO')) return 'Empréstimo';
  if (tipo === 'entrada') return 'Venda de sistema solar';

  return 'Outros';
}

function formaPagamentoDoMovimento(descricao) {
  const texto = descricao.toUpperCase();

  if (texto.includes('PIX')) return 'PIX';
  if (texto.includes('BOLETO')) return 'Boleto';
  if (texto.includes('CARTAO') || texto.includes('CARTÃO')) return 'Cartão';

  return 'Débito bancário';
}

export function importarOFX(conteudo) {
  const blocos = String(conteudo || '').match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>)/gi) || [];
  const ignorados = [];
  const movimentacoes = [];

  blocos.forEach((bloco, indice) => {
    const descricao = lerTag(bloco, 'MEMO').replace(/\s+/g, ' ').trim();
    const valorAssinado = normalizarNumero(lerTag(bloco, 'TRNAMT'));
    const fitid = lerTag(bloco, 'FITID') || `sem-fitid-${indice}`;

    if (!descricao || !Number.isFinite(valorAssinado) || valorAssinado === 0) return;

    if (descricao.toUpperCase().includes('CONTAMAX')) {
      ignorados.push(descricao);
      return;
    }

    const tipo = valorAssinado > 0 ? 'entrada' : 'saida';

    movimentacoes.push({
      id: `ofx-${fitid}`,
      descricao,
      tipo,
      categoria: categoriaDoMovimento(descricao, tipo),
      valor: Math.abs(valorAssinado),
      data: normalizarData(lerTag(bloco, 'DTPOSTED')),
      formaPagamento: formaPagamentoDoMovimento(descricao),
      origem: 'OFX Santander',
    });
  });

  return { movimentacoes, ignorados };
}

function dividirCSV(linha, separador) {
  const colunas = [];
  let atual = '';
  let emAspas = false;

  for (let indice = 0; indice < linha.length; indice += 1) {
    const caractere = linha[indice];

    if (caractere === '"') {
      if (emAspas && linha[indice + 1] === '"') {
        atual += '"';
        indice += 1;
      } else {
        emAspas = !emAspas;
      }
    } else if (caractere === separador && !emAspas) {
      colunas.push(atual.trim());
      atual = '';
    } else {
      atual += caractere;
    }
  }

  colunas.push(atual.trim());
  return colunas;
}

function chaveNormalizada(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '');
}

export function importarContasCSV(conteudo) {
  const linhas = String(conteudo || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((linha) => linha.trim());

  if (linhas.length < 2) {
    throw new Error('O CSV não contém contas para importar.');
  }

  const separador = linhas[0].includes(';') ? ';' : ',';
  const cabecalhos = dividirCSV(linhas[0], separador).map(chaveNormalizada);
  const indice = (nomes) => cabecalhos.findIndex((item) => nomes.includes(item));
  const posicoes = {
    vencimento: indice(['vencimento', 'data']),
    descricao: indice(['descricao', 'documento']),
    fornecedor: indice(['fornecedor', 'beneficiario', 'beneficiariooriginal']),
    categoria: indice(['categoria']),
    valor: indice(['valor', 'valordodocumento', 'valordodocumentors']),
    status: indice(['status', 'situacao']),
  };

  if (posicoes.vencimento < 0 || posicoes.fornecedor < 0 || posicoes.valor < 0) {
    throw new Error('Use as colunas Vencimento, Fornecedor e Valor no CSV.');
  }

  return linhas.slice(1).map((linha, linhaIndice) => {
    const colunas = dividirCSV(linha, separador);
    const fornecedor = colunas[posicoes.fornecedor]?.trim() || 'Não informado';
    const vencimento = normalizarData(colunas[posicoes.vencimento]);
    const valor = Math.abs(normalizarNumero(colunas[posicoes.valor]));
    const descricao = posicoes.descricao >= 0
      ? colunas[posicoes.descricao]?.trim()
      : `Pagamento para ${fornecedor}`;

    if (!vencimento || !Number.isFinite(valor) || valor <= 0) {
      throw new Error(`Dados inválidos na linha ${linhaIndice + 2} do CSV.`);
    }

    return {
      id: `csv-pagar-${vencimento}-${fornecedor}-${valor}`.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      descricao: descricao || `Pagamento para ${fornecedor}`,
      fornecedor,
      categoria: posicoes.categoria >= 0
        ? colunas[posicoes.categoria]?.trim() || 'Fornecedor'
        : 'Fornecedor',
      valor,
      vencimento,
      status: posicoes.status >= 0 && chaveNormalizada(colunas[posicoes.status]) === 'paga'
        ? 'paga'
        : 'pendente',
      origem: 'CSV importado',
    };
  });
}

export function mesclarSemDuplicar(atuais, novos) {
  const ids = new Set(atuais.map((item) => item.id));
  const assinatura = (item) => [
    item.data || item.vencimento || '',
    item.tipo || '',
    Number(item.valor || 0).toFixed(2),
    String(item.descricao || '').trim().toLowerCase(),
  ].join('|');
  const assinaturas = new Set(atuais.map(assinatura));
  const ineditos = novos.filter(
    (item) => !ids.has(item.id) && !assinaturas.has(assinatura(item))
  );

  return {
    dados: [...ineditos, ...atuais],
    adicionados: ineditos.length,
    duplicados: novos.length - ineditos.length,
  };
}
