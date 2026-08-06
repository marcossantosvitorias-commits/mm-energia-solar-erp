import React, { useMemo, useRef, useState } from 'react';
import { Download, ImagePlus, Trash2 } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';

const TAMANHOS = {
  feed: { largura: 1080, altura: 1350, label: 'Feed 4:5' },
  story: { largura: 1080, altura: 1920, label: 'Story 9:16' },
  quadrado: { largura: 1080, altura: 1080, label: 'Quadrado 1:1' },
};

const carregarImagem = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

function GeradorInstagramPage() {
  const [formato, setFormato] = useState('feed');
  const [titulo, setTitulo] = useState('Mais uma instalação concluída!');
  const [subtitulo, setSubtitulo] = useState('Energia solar, economia e segurança para o cliente.');
  const [cidade, setCidade] = useState('Bauru - SP');
  const [fotos, setFotos] = useState([]);
  const inputRef = useRef(null);

  const tamanho = TAMANHOS[formato];
  const proporcaoPreview = useMemo(() => `${tamanho.largura} / ${tamanho.altura}`, [tamanho]);

  const adicionarFotos = (event) => {
    const arquivos = Array.from(event.target.files || []).slice(0, 4 - fotos.length);
    const novas = arquivos.map((arquivo) => ({
      id: `${arquivo.name}-${arquivo.lastModified}-${Math.random()}`,
      nome: arquivo.name,
      url: URL.createObjectURL(arquivo),
    }));
    setFotos((atuais) => [...atuais, ...novas].slice(0, 4));
    event.target.value = '';
  };

  const removerFoto = (id) => {
    setFotos((atuais) => {
      const removida = atuais.find((foto) => foto.id === id);
      if (removida) URL.revokeObjectURL(removida.url);
      return atuais.filter((foto) => foto.id !== id);
    });
  };

  const desenharImagemCobrindo = (ctx, imagem, x, y, largura, altura) => {
    const escala = Math.max(largura / imagem.width, altura / imagem.height);
    const w = imagem.width * escala;
    const h = imagem.height * escala;
    ctx.drawImage(imagem, x + (largura - w) / 2, y + (altura - h) / 2, w, h);
  };

  const gerarPost = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = tamanho.largura;
    canvas.height = tamanho.altura;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#071a2b';
    ctx.fillRect(0, 0, w, h);

    const faixaTopo = Math.round(h * 0.20);
    const faixaRodape = Math.round(h * 0.22);
    const areaFotosY = faixaTopo;
    const areaFotosH = h - faixaTopo - faixaRodape;

    const imagens = await Promise.all(fotos.map((foto) => carregarImagem(foto.url)));
    if (imagens.length === 0) {
      ctx.fillStyle = '#0f2b43';
      ctx.fillRect(50, areaFotosY, w - 100, areaFotosH);
      ctx.fillStyle = '#f5c400';
      ctx.font = `700 ${Math.round(w * 0.04)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('ADICIONE AS FOTOS DA INSTALAÇÃO', w / 2, areaFotosY + areaFotosH / 2);
    } else {
      const gap = 16;
      const padding = 34;
      const cols = imagens.length === 1 ? 1 : 2;
      const rows = imagens.length <= 2 ? 1 : 2;
      const cw = (w - padding * 2 - gap * (cols - 1)) / cols;
      const ch = (areaFotosH - padding * 2 - gap * (rows - 1)) / rows;
      imagens.forEach((imagem, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = padding + col * (cw + gap);
        const y = areaFotosY + padding + row * (ch + gap);
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, cw, ch, 24);
        ctx.clip();
        desenharImagemCobrindo(ctx, imagem, x, y, cw, ch);
        ctx.restore();
      });
    }

    ctx.fillStyle = '#f5c400';
    ctx.fillRect(0, 0, 18, h);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${Math.round(w * 0.052)}px Arial`;
    ctx.fillText(titulo.toUpperCase(), 58, Math.round(faixaTopo * 0.48), w - 116);

    ctx.fillStyle = '#f5c400';
    ctx.font = `700 ${Math.round(w * 0.026)}px Arial`;
    ctx.fillText(cidade.toUpperCase(), 60, Math.round(faixaTopo * 0.76));

    ctx.fillStyle = '#071a2b';
    ctx.fillRect(0, h - faixaRodape, w, faixaRodape);
    ctx.fillStyle = '#ffffff';
    ctx.font = `600 ${Math.round(w * 0.032)}px Arial`;
    ctx.fillText(subtitulo, 58, h - Math.round(faixaRodape * 0.55), w - 116);

    ctx.fillStyle = '#f5c400';
    ctx.font = `800 ${Math.round(w * 0.035)}px Arial`;
    ctx.fillText('MM ENERGIA SOLAR', 58, h - Math.round(faixaRodape * 0.22));
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = `600 ${Math.round(w * 0.022)}px Arial`;
    ctx.fillText('mmenergiasolar.com.br', w - 58, h - Math.round(faixaRodape * 0.22));

    const link = document.createElement('a');
    link.download = `mm-energia-post-${formato}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png', 1);
    link.click();
  };

  return (
    <FinanceLayout title="Gerador de posts" subtitle="Coloque as fotos da instalação e gere a arte pronta para publicar no Instagram." theme="empresa">
      <section className="finance-two-columns" style={{ alignItems: 'start' }}>
        <article className="finance-panel">
          <div className="finance-panel-header"><h2>Conteúdo do post</h2></div>
          <div className="finance-form">
            <label className="finance-field"><span>Formato</span><select value={formato} onChange={(e) => setFormato(e.target.value)}>{Object.entries(TAMANHOS).map(([id, item]) => <option key={id} value={id}>{item.label} — {item.largura}×{item.altura}</option>)}</select></label>
            <label className="finance-field"><span>Título</span><input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={58} /></label>
            <label className="finance-field"><span>Texto abaixo</span><textarea value={subtitulo} onChange={(e) => setSubtitulo(e.target.value)} rows={3} maxLength={110} /></label>
            <label className="finance-field"><span>Cidade</span><input value={cidade} onChange={(e) => setCidade(e.target.value)} /></label>
          </div>

          <div style={{ marginTop: 18 }}>
            <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={adicionarFotos} />
            <button type="button" className="finance-primary-button" onClick={() => inputRef.current?.click()} disabled={fotos.length >= 4}><ImagePlus size={18} /> Adicionar fotos ({fotos.length}/4)</button>
          </div>

          {fotos.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 14 }}>{fotos.map((foto) => <div key={foto.id} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', aspectRatio: '1.2', background: '#e5e7eb' }}><img src={foto.url} alt={foto.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /><button type="button" onClick={() => removerFoto(foto.id)} aria-label="Remover foto" style={{ position: 'absolute', right: 6, top: 6, border: 0, borderRadius: 8, padding: 7, cursor: 'pointer' }}><Trash2 size={16} /></button></div>)}</div>}

          <button type="button" className="finance-primary-button" onClick={gerarPost} style={{ width: '100%', justifyContent: 'center', marginTop: 18 }}><Download size={18} /> Gerar e baixar PNG</button>
        </article>

        <article className="finance-panel">
          <div className="finance-panel-header"><h2>Prévia</h2></div>
          <div style={{ aspectRatio: proporcaoPreview, maxHeight: 680, margin: '0 auto', overflow: 'hidden', borderRadius: 18, background: '#071a2b', borderLeft: '8px solid #f5c400', display: 'flex', flexDirection: 'column', boxShadow: '0 18px 50px rgba(7,26,43,.18)' }}>
            <div style={{ padding: '5% 5% 3%', color: '#fff' }}><strong style={{ display: 'block', fontSize: 'clamp(15px,2.2vw,30px)', lineHeight: 1.05 }}>{titulo.toUpperCase()}</strong><span style={{ color: '#f5c400', fontWeight: 700, fontSize: 'clamp(10px,1.2vw,16px)' }}>{cidade.toUpperCase()}</span></div>
            <div style={{ flex: 1, padding: '2.5%', display: 'grid', gridTemplateColumns: fotos.length === 1 ? '1fr' : 'repeat(2,1fr)', gridTemplateRows: fotos.length <= 2 ? '1fr' : 'repeat(2,1fr)', gap: 8, minHeight: 0 }}>{fotos.length ? fotos.map((foto) => <img key={foto.id} src={foto.url} alt="Prévia" style={{ width: '100%', height: '100%', minHeight: 0, objectFit: 'cover', borderRadius: 10 }} />) : <div style={{ gridColumn: '1 / -1', display: 'grid', placeItems: 'center', color: '#f5c400', background: '#0f2b43', borderRadius: 12, fontWeight: 800, textAlign: 'center', padding: 20 }}>ADICIONE AS FOTOS DA INSTALAÇÃO</div>}</div>
            <div style={{ padding: '4% 5%', color: '#fff' }}><div style={{ fontWeight: 600, fontSize: 'clamp(10px,1.2vw,16px)' }}>{subtitulo}</div><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginTop: '4%' }}><strong style={{ color: '#f5c400', fontSize: 'clamp(11px,1.4vw,19px)' }}>MM ENERGIA SOLAR</strong><span style={{ fontSize: 'clamp(8px,1vw,13px)' }}>mmenergiasolar.com.br</span></div></div>
          </div>
        </article>
      </section>
    </FinanceLayout>
  );
}

export default GeradorInstagramPage;
