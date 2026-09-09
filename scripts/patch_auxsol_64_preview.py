from pathlib import Path

micro_page = Path('MM_ERP_GitHub_Pronto/apps/web/src/pages/CotacoesBelenusSupabasePage.jsx')
inversor_page = Path('MM_ERP_GitHub_Pronto/apps/web/src/pages/InversorStringPage.jsx')
proposal = Path('MM_ERP_GitHub_Pronto/apps/web/src/pages/ProposalGenerator.jsx')

# Remove 64 placas da tela de microinversor.
text = micro_page.read_text(encoding='utf-8')
text = text.replace(
    "const QUANTIDADES_KITS = [...Array.from({ length: 19 }, (_, indice) => indice + 4), 64];",
    "const QUANTIDADES_KITS = Array.from({ length: 19 }, (_, indice) => indice + 4);"
)
micro_page.write_text(text, encoding='utf-8')

# Adiciona 64 placas somente na tela de inversor string.
text = inversor_page.read_text(encoding='utf-8')
text = text.replace(
    "const QUANTIDADES_KITS = Array.from({ length: 19 }, (_, indice) => indice + 4);",
    "const QUANTIDADES_KITS = [...Array.from({ length: 19 }, (_, indice) => indice + 4), 64];"
)

kit_64 = "  { placas: 64, potenciaPlaca: 620, valorTotalDistribuidora: 63161.27, inversor: 'Auxsol trifásico 20 kW 220 V, 4 MPPT', referencia: 'Orçamento WEB-006717414' },\n"
anchor = "  { placas: 12, potenciaPlaca: 620, valorTotalDistribuidora: 9799.71, inversor: 'Auxsol monofásico 6 kW', referencia: 'Cotação cadastrada em 10/08/2026 · produtos R$ 9.263,61 · frete R$ 536,10' },\n"
if "placas: 64" not in text:
    text = text.replace(anchor, anchor + kit_64)
text = text.replace(
    "Kits organizados de 4 até 22 placas. Quando ainda não houver preço cadastrado, o kit fica identificado como pendente.",
    "Kits organizados de 4 até 22 placas, além do projeto especial de 64 placas. Quando ainda não houver preço cadastrado, o kit fica identificado como pendente."
)
inversor_page.write_text(text, encoding='utf-8')

# Mantém as imagens exclusivas do orçamento Auxsol 20 kW no PDF.
text = proposal.read_text(encoding='utf-8')
import_line = "import { PAINEL_620_BELENUS_IMAGE, INVERSOR_BELENUS_IMAGE, INVERSOR_75_BELENUS_IMAGE } from '../assets/proposalBelenusImages.js';"
extra_import = "import { JA_SOLAR_620_AUXSOL_QUOTE_IMAGE, AUXSOL_20KW_QUOTE_IMAGE } from '../assets/proposalAuxsol20Images.js';"
if extra_import not in text:
    text = text.replace(import_line, import_line + "\n" + extra_import)

old = """function imagemEquipamentoPdf(valor, ehMicro) {
  if (ehMicro) return MICROINVERSOR_IMAGE;
  const potencia = extrairPotenciaInversor(valor);
  return potencia && potencia >= 7.4 ? INVERSOR_75_BELENUS_IMAGE : INVERSOR_BELENUS_IMAGE;
}"""
new = """function imagemEquipamentoPdf(valor, ehMicro) {
  if (ehMicro) return MICROINVERSOR_IMAGE;
  const texto = String(valor || '');
  if (/auxsol/i.test(texto) && /20\\s*k(?:w)?/i.test(texto)) return AUXSOL_20KW_QUOTE_IMAGE;
  const potencia = extrairPotenciaInversor(valor);
  return potencia && potencia >= 7.4 ? INVERSOR_75_BELENUS_IMAGE : INVERSOR_BELENUS_IMAGE;
}"""
text = text.replace(old, new)

# jsPDF estava recebendo WEBP e tratando como JPEG, deixando o card em branco.
# Converte qualquer WEBP para JPEG via canvas antes de inserir no PDF.
helper_anchor = "async function carregarLogoPdf() {"
helper = """async function prepararImagemPdf(imagem) {
  if (!imagem || !/^data:image\\/webp/i.test(imagem)) return imagem;
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = imagem;
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, img.naturalWidth || img.width || 1);
    canvas.height = Math.max(1, img.naturalHeight || img.height || 1);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.92);
  } catch {
    return imagem;
  }
}

"""
if "async function prepararImagemPdf(imagem)" not in text:
    text = text.replace(helper_anchor, helper + helper_anchor)

old_pdf_vars = """    const imagemEquipamento = imagemEquipamentoPdf(inversorPdf, ehMicroPdf);
    const garantiaEquipamentoPdf = ehMicroPdf ? '15 anos' : '10 anos';"""
new_pdf_vars = """    const ehAuxsol20 = /auxsol/i.test(inversorPdf) && /20\\s*k(?:w)?/i.test(inversorPdf);
    const imagemPainelPdf = await prepararImagemPdf(ehAuxsol20 ? JA_SOLAR_620_AUXSOL_QUOTE_IMAGE : PAINEL_620_BELENUS_IMAGE);
    const imagemEquipamento = await prepararImagemPdf(imagemEquipamentoPdf(inversorPdf, ehMicroPdf));
    const garantiaEquipamentoPdf = ehMicroPdf ? '15 anos' : '10 anos';"""
text = text.replace(old_pdf_vars, new_pdf_vars)

old_panel_special = "imagemContida(doc, (/auxsol/i.test(inversorPdf) && /20\\s*k(?:w)?/i.test(inversorPdf)) ? JA_SOLAR_620_AUXSOL_QUOTE_IMAGE : PAINEL_620_BELENUS_IMAGE, 20, 91, 74, 50);"
text = text.replace(old_panel_special, "imagemContida(doc, imagemPainelPdf, 20, 91, 74, 50);")
text = text.replace("imagemContida(doc, PAINEL_620_BELENUS_IMAGE, 20, 91, 74, 50);", "imagemContida(doc, imagemPainelPdf, 20, 91, 74, 50);")

proposal.write_text(text, encoding='utf-8')
