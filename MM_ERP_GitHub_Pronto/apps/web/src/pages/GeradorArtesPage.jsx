import React, { useEffect, useRef, useState } from 'react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';

const WIDTH = 1080;
const HEIGHT = 1350;
const NAVY = '#073c80';
const GREEN = '#91d51b';
const YELLOW = '#ffdb24';

function readImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível carregar uma das imagens.'));
    img.src = src;
  });
}

function drawCover(ctx, image, x, y, w, h) {
  const scale = Math.max(w / image.width, h / image.height);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, x, y, w, h);
}

function wave(ctx, y, color, offset = 0) {
  ctx.beginPath();
  ctx.moveTo(0, y + 110);
  ctx.bezierCurveTo(270, y + 135 + offset, 580, y - 130 + offset, WIDTH, y - 35);
  ctx.lineTo(WIDTH, y + 24);
  ctx.bezierCurveTo(590, y - 65 + offset, 285, y + 205 + offset, 0, y + 175);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function fitText(ctx, value, maxWidth, startSize, minSize = 28) {
  let size = startSize;
  do {
    ctx.font = 'bold ' + size + 'px Arial, sans-serif';
    if (ctx.measureText(value).width <= maxWidth) return size;
    size -= 2;
  } while (size > minSize);
  return minSize;
}

async function renderArt(canvas, data, photoUrls) {
  const ctx = canvas.getContext('2d');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  roundedRect(ctx, 0, 0, WIDTH, HEIGHT, 28);
  ctx.fillStyle = NAVY;
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = YELLOW;
  ctx.beginPath();
  ctx.arc(213, 72, 33, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = NAVY;
  ctx.font = 'bold 42px Arial, sans-serif';
  ctx.fillText('+1', 213, 86);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 45px Arial, sans-serif';
  ctx.fillText('INSTALAÇÃO CONCLUÍDA', 660, 87);

  ctx.fillStyle = YELLOW;
  ctx.beginPath();
  ctx.moveTo(0, 127);
  ctx.lineTo(350, 127);
  ctx.lineTo(420, 177);
  ctx.lineTo(350, 227);
  ctx.lineTo(0, 227);
  ctx.closePath();
  ctx.fill();

  const bairro = data.bairro.trim().toUpperCase();
  const cidadeUf = [data.cidade.trim().toUpperCase(), data.estado.trim().toUpperCase()].filter(Boolean).join('-');
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  if (bairro) {
    fitText(ctx, bairro, 335, 35, 22);
    ctx.fillText(bairro, 32, 169);
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.fillText(cidadeUf, 32, 206);
  } else {
    fitText(ctx, cidadeUf, 350, 35, 22);
    ctx.fillText(cidadeUf, 32, 185);
  }

  wave(ctx, 290, YELLOW, 2);
  wave(ctx, 274, GREEN, -15);
  const gridTop = 405;
  const gridHeight = 655;
  ctx.fillStyle = '#eef1f4';
  ctx.fillRect(0, gridTop, WIDTH, gridHeight);
  const images = await Promise.all(photoUrls.map((url) => url ? readImage(url) : Promise.resolve(null)));
  const gap = 6;
  const cells = [
    [0, gridTop, WIDTH / 2 - gap / 2, gridHeight / 2 - gap / 2],
    [WIDTH / 2 + gap / 2, gridTop, WIDTH / 2 - gap / 2, gridHeight / 2 - gap / 2],
    [0, gridTop + gridHeight / 2 + gap / 2, WIDTH / 2 - gap / 2, gridHeight / 2 - gap / 2],
    [WIDTH / 2 + gap / 2, gridTop + gridHeight / 2 + gap / 2, WIDTH / 2 - gap / 2, gridHeight / 2 - gap / 2],
  ];
  cells.forEach(([x, y, w, h], i) => {
    const img = images[i];
    if (img) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      drawCover(ctx, img, x, y, w, h);
      ctx.restore();
    } else {
      ctx.fillStyle = '#dce4ed';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#6a7a8c';
      ctx.textAlign = 'center';
      ctx.font = '26px Arial, sans-serif';
      ctx.fillText('Foto ' + (i + 1), x + w / 2, y + h / 2);
    }
  });

  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 1060, WIDTH, 290);
  wave(ctx, 1061, GREEN, -50);
  ctx.fillStyle = YELLOW;
  ctx.beginPath();
  ctx.moveTo(0, 1193);
  ctx.bezierCurveTo(250, 1230, 570, 1142, WIDTH, 1105);
  ctx.lineTo(WIDTH, 1127);
  ctx.bezierCurveTo(630, 1170, 300, 1250, 0, 1220);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  const power = (data.potencia || '').trim().replace(/\s+/g, ' ').toUpperCase();
  const headline = 'POTÊNCIA: ' + (power || '—') + (power && !/KW|MW|WP/.test(power) ? ' KWP' : '');
  fitText(ctx, headline, 665, 42, 28);
  ctx.fillText(headline, 45, 1291);

  try {
    const logo = await readImage(import.meta.env.BASE_URL + 'logo-mm.png');
    const maxW = 260, maxH = 180, scale = Math.min(maxW / logo.width, maxH / logo.height);
    const w = logo.width * scale, h = logo.height * scale;
    ctx.drawImage(logo, 800 + (260 - w) / 2, 1138 + (180 - h) / 2, w, h);
  } catch {
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('MM ENERGIA SOLAR', 735, 1286);
  }
}

export default function GeradorArtesPage() {
  const [dados, setDados] = useState({ bairro: '', cidade: '', estado: 'SP', potencia: '' });
  const [fotos, setFotos] = useState([null, null, null, null]);
  const [erro, setErro] = useState('');
  const canvasRef = useRef(null);

  useEffect(() => {
    let ativo = true;
    const links = fotos.map((file) => file ? URL.createObjectURL(file) : null);
    renderArt(canvasRef.current, dados, links).then(() => {
      if (ativo) setErro('');
    }).catch((e) => { if (ativo) setErro(e.message); });
    return () => { ativo = false; links.forEach((url) => { if (url) URL.revokeObjectURL(url); }); };
  }, [dados, fotos]);

  const update = (key, value) => setDados((prev) => ({ ...prev, [key]: value }));
  const upload = (index, file) => {
    if (file && !file.type.startsWith('image/')) { setErro('Escolha um arquivo de imagem.'); return; }
    setFotos((prev) => prev.map((old, i) => i === index ? (file || null) : old));
  };
  const download = () => {
    if (!dados.cidade.trim() || !dados.estado.trim() || !dados.potencia.trim()) {
      setErro('Preencha cidade, estado e potência para baixar a arte.');
      return;
    }
    if (!fotos.some(Boolean)) { setErro('Adicione pelo menos uma foto da instalação.'); return; }
    const a = document.createElement('a');
    const nome = [dados.bairro, dados.cidade, dados.estado].filter(Boolean).join('-').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]+/g, '-');
    a.download = 'mm-instalacao-' + nome + '.png';
    a.href = canvasRef.current.toDataURL('image/png');
    a.click();
  };

  const inputStyle = { width: '100%', minWidth: 0, border: '1px solid #cbd5e1', borderRadius: 9, padding: '12px 14px', fontSize: 16, background: '#fff', color: '#172b4d' };
  const labelStyle = { display: 'grid', gap: 6, fontWeight: 700, color: '#233c5f', fontSize: 14 };
  return (
    <FinanceLayout title="Artes de instalações" subtitle="Gere imagens prontas para o site da MM Energia Solar com fotos e dados da obra.">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 24, alignItems: 'start' }}>
        <section style={{ padding: 22, borderRadius: 16, background: '#fff', boxShadow: '0 3px 16px #0b2b4d14' }}>
          <h2 style={{ marginTop: 0, color: '#073c80' }}>Informações da instalação</h2>
          <div style={{ display: 'grid', gap: 15 }}>
            <label style={labelStyle}>Bairro (opcional)<input style={inputStyle} value={dados.bairro} onChange={(e) => update('bairro', e.target.value)} placeholder="Ex.: Jardim Pagani" maxLength={45} /></label>
            <label style={labelStyle}>Cidade *<input style={inputStyle} value={dados.cidade} onChange={(e) => update('cidade', e.target.value)} placeholder="Ex.: Bauru" maxLength={45} /></label>
            <label style={labelStyle}>UF *<select style={inputStyle} value={dados.estado} onChange={(e) => update('estado', e.target.value)}>{['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map((uf) => <option key={uf}>{uf}</option>)}</select></label>
            <label style={labelStyle}>Potência do sistema (kWp) *<input style={inputStyle} value={dados.potencia} onChange={(e) => update('potencia', e.target.value)} placeholder="Ex.: 2,44" maxLength={16} /></label>
          </div>
          <h3 style={{ color: '#073c80', marginTop: 26 }}>Fotos da instalação</h3>
          <p style={{ fontSize: 13, color: '#64748b' }}>Adicione até quatro fotos. A arte ajusta o enquadramento automaticamente sem deformar as imagens.</p>
          <div style={{ display: 'grid', gap: 12 }}>
            {fotos.map((file, i) => <label key={i} style={{ ...labelStyle, padding: 12, border: '1px dashed #9aacc1', borderRadius: 10, cursor: 'pointer' }}>
              {'Foto ' + (i + 1) + (file ? ': ' + file.name : ' — selecionar')}
              <input type="file" accept="image/*" onChange={(e) => upload(i, e.target.files?.[0])} style={{ maxWidth: '100%', fontSize: 13 }} />
              {file && <button type="button" onClick={(e) => { e.preventDefault(); upload(i, null); }} style={{ width: 'fit-content', cursor: 'pointer' }}>Remover foto</button>}
            </label>)}
          </div>
          {erro && <p role="alert" style={{ color: '#b91c1c', fontWeight: 700 }}>{erro}</p>}
          <button type="button" onClick={download} style={{ marginTop: 22, width: '100%', background: '#073c80', color: 'white', padding: '15px', border: 0, borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 16 }}>Baixar imagem PNG</button>
          <p style={{ marginBottom: 0, color: '#64748b', fontSize: 13 }}>Formato 1080 × 1350 px (4:5). A imagem é gerada no navegador; suas fotos não são enviadas para servidores.</p>
        </section>
        <section style={{ minWidth: 0 }}>
          <h2 style={{ color: '#073c80', marginTop: 0 }}>Prévia da arte</h2>
          <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} aria-label="Prévia da arte de instalação" style={{ display: 'block', width: '100%', maxWidth: 540, height: 'auto', borderRadius: 12, boxShadow: '0 6px 18px #0b2b4d25' }} />
        </section>
      </div>
    </FinanceLayout>
  );
}
