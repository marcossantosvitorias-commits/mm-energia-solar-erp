from pathlib import Path

page = Path('MM_ERP_GitHub_Pronto/apps/web/src/pages/CotacoesBelenusSupabasePage.jsx')
proposal = Path('MM_ERP_GitHub_Pronto/apps/web/src/pages/ProposalGenerator.jsx')

text = page.read_text(encoding='utf-8')
text = text.replace(
    "const QUANTIDADES_KITS = Array.from({ length: 19 }, (_, indice) => indice + 4);",
    "const QUANTIDADES_KITS = [...Array.from({ length: 19 }, (_, indice) => indice + 4), 64];"
)
page.write_text(text, encoding='utf-8')

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

old_panel = "imagemContida(doc, PAINEL_620_BELENUS_IMAGE, 20, 91, 74, 50);"
new_panel = "imagemContida(doc, (/auxsol/i.test(inversorPdf) && /20\\s*k(?:w)?/i.test(inversorPdf)) ? JA_SOLAR_620_AUXSOL_QUOTE_IMAGE : PAINEL_620_BELENUS_IMAGE, 20, 91, 74, 50);"
text = text.replace(old_panel, new_panel)
proposal.write_text(text, encoding='utf-8')
