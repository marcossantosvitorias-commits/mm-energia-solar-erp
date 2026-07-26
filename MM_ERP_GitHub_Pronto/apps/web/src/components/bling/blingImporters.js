const tipoPorArquivo = {
  contatos: 'Contatos',
  produtos: 'Produtos',
  saldos: 'Saldos de estoque',
  caixa: 'Caixa e bancos',
  pagar: 'Contas a pagar',
  receber: 'Contas a receber',
  compras: 'Pedidos de compra',
  vendas: 'Pedidos de venda',
};

function limparChave(valor) {
  return String(valor || '')
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function limparTexto(valor) {
  return String(valor ?? '').replace(/\t/g, '').trim();
}

export function numeroBling(valor) {
  const texto = limparTexto(valor);
  if (!texto) return 0;
  const numero = Number(texto.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(numero) ? numero : 0;
}

export function dataBling(valor) {
  const texto = limparTexto(valor);
  const partes = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return partes ? `${partes[3]}-${partes[2]}-${partes[1]}` : texto;
}

export function lerCSVBling(conteudo) {
  const texto = String(conteudo || '').replace(/^\uFEFF/, '');
  const linhas = [];
  let linha = [];
  let campo = '';
  let emAspas = false;

  for (let indice = 0; indice < texto.length; indice += 1) {
    const caractere = texto[indice];
    if (caractere === '"') {
      if (emAspas && texto[indice + 1] === '"') {
        campo += '"';
        indice += 1;
      } else {
        emAspas = !emAspas;
      }
    } else if (caractere === ';' && !emAspas) {
      linha.push(campo);
      campo = '';
    } else if ((caractere === '\n' || caractere === '\r') && !emAspas) {
      if (caractere === '\r' && texto[indice + 1] === '\n') indice += 1;
      linha.push(campo);
      if (linha.some((item) => limparTexto(item))) linhas.push(linha);
      linha = [];
      campo = '';
    } else {
      campo += caractere;
    }
  }

  if (campo || linha.length) {
    linha.push(campo);
    if (linha.some((item) => limparTexto(item))) linhas.push(linha);
  }
  if (!linhas.length) return [];

  const cabecalhos = linhas[0].map(limparChave);
  return linhas.slice(1).map((colunas) =>
    Object.fromEntries(
      cabecalhos.map((cabecalho, indice) => [cabecalho, limparTexto(colunas[indice])]),
    ),
  );
}

function valor(linha, ...nomes) {
  for (const nome of nomes) {
    const resultado = linha[limparChave(nome)];
    if (resultado !== undefined) return resultado;
  }
  return '';
}

export function detectarTipoBling(nomeArquivo, linhas) {
  const nome = String(nomeArquivo || '').toLowerCase();
  if (nome.includes('contato')) return 'contatos';
  if (nome.includes('saldo') || nome.includes('estoque')) return 'saldos';
  if (nome.includes('produto')) return 'produtos';
  if (nome.includes('caixa') || nome.includes('banco')) return 'caixa';
  if (nome.includes('pagar')) return 'pagar';
  if (nome.includes('receber')) return 'receber';
  if (nome.includes('compra')) return 'compras';
  if (nome.includes('venda')) return 'vendas';

  const primeira = linhas[0] || {};
  if ('nomecomprador' in primeira) return 'vendas';
  if ('fornecedor' in primeira && 'datavencimento' in primeira) return 'pagar';
  if ('cliente' in primeira && 'datavencimento' in primeira) return 'receber';
  if ('idproduto' in primeira && 'movimentacaodeestoque' in primeira) return 'saldos';
  if ('descricao' in primeira && 'ncm' in primeira) return 'produtos';
  if ('historico' in primeira && 'tipo' in primeira) return 'caixa';
  if ('nome' in primeira && 'cnpjcpf' in primeira) return 'contatos';
  return null;
}

function tipoEquipamento(descricao, categoria) {
  const texto = `${categoria} ${descricao}`.toUpperCase();
  if (texto.includes('MICRO INV')) return 'Microinversor';
  if (texto.includes('INVERSOR')) return 'Inversor';
  if (texto.includes('MODULO') || texto.includes('PAINEL')) return 'Placa';
  if (texto.includes('CABO')) return 'Cabo';
  if (texto.includes('CONECTOR') || texto.includes('MC4')) return 'Conector';
  if (texto.includes('ESTRUT') || texto.includes('FIXA') || texto.includes('GRAMPO')) return 'Estrutura';
  if (texto.includes('DPS') || texto.includes('QUADRO') || texto.includes('STRING')) return 'Proteção elétrica';
  if (texto.includes('GERADOR')) return 'Kit gerador';
  return categoria || 'Outro';
}

function potenciaDescricao(descricao) {
  const texto = String(descricao || '').toUpperCase().replace(',', '.');
  const kwp = texto.match(/(\d+(?:\.\d+)?)\s*KWP/);
  const kw = texto.match(/(\d+(?:\.\d+)?)\s*KW/);
  const watts = texto.match(/(\d+(?:\.\d+)?)\s*W(?:\s|$)/);
  if (kwp) return Math.round(Number(kwp[1]) * 1000);
  if (kw) return Math.round(Number(kw[1]) * 1000);
  if (watts) return Math.round(Number(watts[1]));
  return 0;
}

export function converterArquivoBling(tipo, linhas) {
  const dados = linhas.filter((linha) => {
    const primeiro = Object.values(linha)[0] || '';
    return !String(primeiro).startsWith('ID com o qual o Bling identifica');
  });

  if (tipo === 'contatos') {
    return dados.map((linha) => ({
      id: `bling-contato-${valor(linha, 'ID')}`,
      blingId: valor(linha, 'ID'),
      nome: valor(linha, 'Nome'),
      fantasia: valor(linha, 'Fantasia'),
      documento: valor(linha, 'CNPJ / CPF'),
      telefone: valor(linha, 'Celular') || valor(linha, 'Fone'),
      email: valor(linha, 'E-mail'),
      endereco: valor(linha, 'Endereço'),
      numero: valor(linha, 'Número'),
      bairro: valor(linha, 'Bairro'),
      cep: valor(linha, 'CEP'),
      cidade: valor(linha, 'Cidade'),
      estado: valor(linha, 'UF'),
      tipoContato: valor(linha, 'Tipo contato'),
      situacao: valor(linha, 'Situação'),
      origem: 'Bling',
    }));
  }

  if (tipo === 'produtos') {
    return dados
      .filter((linha) => limparChave(valor(linha, 'Situação')) !== 'excluido')
      .map((linha) => {
        const descricao = valor(linha, 'Descrição');
        const categoria = valor(linha, 'Categoria do produto');
        return {
          id: `bling-produto-${valor(linha, 'ID')}`,
          blingId: valor(linha, 'ID'),
          sku: valor(linha, 'Código'),
          tipo: tipoEquipamento(descricao, categoria),
          marca: valor(linha, 'Marca') || 'Sem marca',
          modelo: descricao,
          potencia: potenciaDescricao(descricao),
          custo: numeroBling(valor(linha, 'Preço de custo', 'Preço de compra')),
          precoVenda: numeroBling(valor(linha, 'Preço')),
          estoque: numeroBling(valor(linha, 'Estoque')),
          fornecedor: valor(linha, 'Fornecedor') || 'Bling',
          ncm: valor(linha, 'NCM'),
          unidade: valor(linha, 'Unidade') || 'UN',
          atualizadoEm: new Date().toLocaleDateString('pt-BR'),
          origem: 'Bling',
        };
      });
  }

  if (tipo === 'saldos') {
    return dados.map((linha) => ({
      id: `bling-estoque-${valor(linha, 'ID Produto') || valor(linha, 'Código SKU*')}`,
      blingId: valor(linha, 'ID Produto'),
      sku: valor(linha, 'Código SKU*'),
      nome: valor(linha, 'Nome do Produto'),
      deposito: valor(linha, 'Depósito*'),
      estoque: numeroBling(valor(linha, 'Movimentação de Estoque*')),
      custo: numeroBling(valor(linha, 'Preço de Custo', 'Preço de Compra*')),
    }));
  }

  if (tipo === 'caixa') {
    return dados
      .map((linha) => {
        const codigoTipo = valor(linha, 'Tipo').toUpperCase();
        return {
          id: `bling-caixa-${valor(linha, 'Id')}`,
          blingId: valor(linha, 'Id'),
          descricao: valor(linha, 'Histórico') || 'Movimentação Bling',
          tipo: codigoTipo === 'C' ? 'entrada' : 'saida',
          categoria: valor(linha, 'Categoria') || 'Outros',
          valor: Math.abs(numeroBling(valor(linha, 'Valor'))),
          data: dataBling(valor(linha, 'Data')),
          formaPagamento: String(valor(linha, 'Histórico')).toUpperCase().includes('PIX') ? 'PIX' : 'Conta bancária',
          cliente: valor(linha, 'Cliente'),
          origem: 'Bling',
        };
      })
      .filter((item) => item.valor > 0);
  }

  if (tipo === 'pagar' || tipo === 'receber') {
    return dados.map((linha) => {
      const pessoa = tipo === 'pagar' ? valor(linha, 'Fornecedor') : valor(linha, 'Cliente');
      const situacao = limparChave(valor(linha, 'Situação'));
      const liquidada = ['pago', 'paga', 'liquidado', 'liquidada'].includes(situacao);
      return {
        id: `bling-${tipo}-${valor(linha, 'ID')}`,
        blingId: valor(linha, 'ID'),
        descricao: valor(linha, 'Histórico') || valor(linha, 'Número documento') || `${tipo === 'pagar' ? 'Pagamento' : 'Recebimento'} Bling`,
        ...(tipo === 'pagar' ? { fornecedor: pessoa } : { cliente: pessoa }),
        categoria: valor(linha, 'Categoria') || (tipo === 'pagar' ? 'Fornecedor' : 'Venda de sistema solar'),
        valor: numeroBling(valor(linha, 'Valor documento')),
        vencimento: dataBling(valor(linha, 'Data vencimento')),
        status: liquidada ? (tipo === 'pagar' ? 'paga' : 'recebida') : 'pendente',
        documento: valor(linha, 'Número documento'),
        formaPagamento: valor(linha, 'Forma pagamento'),
        origem: 'Bling',
      };
    });
  }

  if (tipo === 'compras') {
    return dados.map((linha) => ({
      id: `bling-compra-${valor(linha, 'ID')}-${valor(linha, 'ID produto')}`,
      blingId: valor(linha, 'ID'),
      numero: valor(linha, 'N° do pedido'),
      data: dataBling(valor(linha, 'Data')),
      fornecedor: valor(linha, 'Nome do contato'),
      produto: valor(linha, 'Descrição'),
      sku: valor(linha, 'Código'),
      quantidade: numeroBling(valor(linha, 'Quantidade')),
      valorUnitario: numeroBling(valor(linha, 'Valor unitário')),
      situacao: valor(linha, 'Situação'),
      origem: 'Bling',
    }));
  }

  if (tipo === 'vendas') {
    return dados.map((linha) => ({
      id: `bling-venda-${valor(linha, 'Número pedido')}-${valor(linha, 'SKU')}`,
      numero: valor(linha, 'Número pedido'),
      data: dataBling(valor(linha, 'Data')),
      cliente: valor(linha, 'Nome Comprador'),
      documento: valor(linha, 'CPF/CNPJ Comprador'),
      produto: valor(linha, 'Produto'),
      sku: valor(linha, 'SKU'),
      quantidade: numeroBling(valor(linha, 'Quantidade')),
      valorUnitario: numeroBling(valor(linha, 'Valor Unitário')),
      total: numeroBling(valor(linha, 'Valor Total', 'Total Pedido')),
      pagamento: valor(linha, 'Forma Pagamento'),
      vendedor: valor(linha, 'Vendedor'),
      origem: 'Bling',
    }));
  }

  return [];
}

export function nomeTipoBling(tipo) {
  return tipoPorArquivo[tipo] || tipo;
}

export function mesclarPorId(atuais, novos) {
  const mapa = new Map(atuais.map((item) => [item.id, item]));
  let adicionados = 0;
  let atualizados = 0;
  novos.forEach((item) => {
    if (mapa.has(item.id)) atualizados += 1;
    else adicionados += 1;
    mapa.set(item.id, { ...mapa.get(item.id), ...item });
  });
  return { dados: Array.from(mapa.values()), adicionados, atualizados };
}

export function aplicarSaldos(equipamentos, saldos) {
  const porBling = new Map(equipamentos.map((item, indice) => [String(item.blingId || ''), indice]));
  const porSku = new Map(equipamentos.map((item, indice) => [limparTexto(item.sku).toLowerCase(), indice]));
  const resultado = [...equipamentos];
  let atualizados = 0;

  saldos.forEach((saldo) => {
    const indice = porBling.get(String(saldo.blingId || '')) ?? porSku.get(limparTexto(saldo.sku).toLowerCase());
    if (indice === undefined) return;
    resultado[indice] = {
      ...resultado[indice],
      estoque: saldo.estoque,
      custo: saldo.custo || resultado[indice].custo,
      deposito: saldo.deposito,
    };
    atualizados += 1;
  });
  return { dados: resultado, atualizados };
}
