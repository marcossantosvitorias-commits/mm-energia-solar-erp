import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Crosshair, ExternalLink, LocateFixed, MapPin, Navigation, Phone, Plus, Radar, RefreshCw, Search, Trash2 } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';

const STORAGE_KEY = 'mm-erp-radar-solar-v2';
const DEFAULT_CENTER = [-22.3145, -49.0587];
const STATUS = ['Novo', 'Contato', 'Visita', 'Proposta', 'Fechado', 'Descartado'];
const CATEGORIES = [['Todos os negócios', 'all'], ['Comércios', 'shop'], ['Indústrias', 'industrial'], ['Escritórios', 'office'], ['Restaurantes', 'restaurant'], ['Mercados', 'supermarket'], ['Escolas', 'school'], ['Clínicas', 'clinic'], ['Hotéis', 'hotel']];
const cleanPhone = (value = '') => String(value).replace(/\D/g, '');
const statusColor = { Novo: '#2563eb', Contato: '#7c3aed', Visita: '#ea580c', Proposta: '#ca8a04', Fechado: '#16a34a', Descartado: '#64748b' };
const getLabel = (tags = {}) => tags.name || tags.brand || tags.operator || 'Estabelecimento sem nome';
const getCategory = (tags = {}) => tags.shop || tags.office || tags.amenity || tags.tourism || tags.industrial || tags.craft || 'comercial';
const getAddress = (tags = {}) => [tags['addr:street'], tags['addr:housenumber'], tags['addr:suburb'], tags['addr:city']].filter(Boolean).join(', ');
const getPhone = (tags = {}) => tags.phone || tags['contact:phone'] || tags.mobile || tags['contact:mobile'] || '';

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  return new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-mm-leaflet]')) {
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; css.dataset.mmLeaflet = 'true'; document.head.appendChild(css);
    }
    const existing = document.querySelector('script[data-mm-leaflet]');
    if (existing) { existing.addEventListener('load', () => resolve(window.L)); existing.addEventListener('error', reject); return; }
    const script = document.createElement('script'); script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; script.async = true; script.dataset.mmLeaflet = 'true'; script.onload = () => resolve(window.L); script.onerror = reject; document.head.appendChild(script);
  });
}

function opportunityScore(tags = {}) {
  const category = getCategory(tags); let score = 55;
  if (['industrial', 'warehouse', 'supermarket', 'mall', 'school', 'hospital', 'hotel'].includes(category)) score += 25;
  if (tags.building && tags.building !== 'yes') score += 8;
  if (getPhone(tags)) score += 7;
  if (tags.website || tags['contact:website']) score += 5;
  return Math.min(score, 95);
}

export default function ProspeccaoSolarPage() {
  const mapNode = useRef(null); const mapRef = useRef(null); const layerRef = useRef(null);
  const [prospects, setProspects] = useState([]); const [results, setResults] = useState([]); const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('Bauru, SP'); const [category, setCategory] = useState('all'); const [radius, setRadius] = useState(2500);
  const [loadingMap, setLoadingMap] = useState(true); const [searching, setSearching] = useState(false); const [message, setMessage] = useState('');
  const [tab, setTab] = useState('mapa'); const [filter, setFilter] = useState('todos'); const [term, setTerm] = useState('');

  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); setProspects(Array.isArray(saved) ? saved : []); } catch { setProspects([]); } }, []);
  const persist = (items) => { setProspects(items); localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); };

  useEffect(() => {
    let active = true;
    loadLeaflet().then((L) => {
      if (!active || !mapNode.current || mapRef.current) return;
      const map = L.map(mapNode.current, { zoomControl: true }).setView(DEFAULT_CENTER, 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 20, attribution: '&copy; OpenStreetMap' }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map); mapRef.current = map; setLoadingMap(false); setTimeout(() => map.invalidateSize(), 200);
    }).catch(() => { setLoadingMap(false); setMessage('Não foi possível carregar o mapa. Verifique a conexão.'); });
    return () => { active = false; };
  }, []);
  useEffect(() => { if (mapRef.current) setTimeout(() => mapRef.current.invalidateSize(), 100); }, [tab]);

  const renderMarkers = (items) => {
    const L = window.L; const map = mapRef.current; if (!L || !map || !layerRef.current) return;
    layerRef.current.clearLayers();
    items.forEach((item) => { const marker = L.circleMarker([item.lat, item.lon], { radius: 8, color: '#0b2f55', weight: 2, fillColor: '#f5c400', fillOpacity: 0.9 }); marker.bindTooltip(item.nome, { direction: 'top' }); marker.on('click', () => setSelected(item)); marker.addTo(layerRef.current); });
  };

  const scanNearby = async (latArg, lonArg) => {
    const center = latArg != null ? { lat: latArg, lng: lonArg } : mapRef.current?.getCenter(); if (!center) return;
    setSearching(true); setMessage('Buscando estabelecimentos na região...');
    const filters = category === 'all' ? ['["name"]["shop"]', '["name"]["office"]', '["name"]["amenity"]', '["name"]["tourism"]', '["name"]["industrial"]'] : category === 'restaurant' ? ['["name"]["amenity"="restaurant"]'] : category === 'supermarket' ? ['["name"]["shop"="supermarket"]'] : category === 'school' ? ['["name"]["amenity"="school"]'] : category === 'clinic' ? ['["name"]["amenity"~"clinic|hospital|doctors"]'] : category === 'hotel' ? ['["name"]["tourism"="hotel"]'] : [`["name"]["${category}"]`];
    const parts = filters.flatMap((f) => [`node(around:${radius},${center.lat},${center.lng})${f};`, `way(around:${radius},${center.lat},${center.lng})${f};`, `relation(around:${radius},${center.lat},${center.lng})${f};`]).join('');
    const overpass = `[out:json][timeout:30];(${parts});out center tags 80;`;
    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body: `data=${encodeURIComponent(overpass)}` });
      if (!response.ok) throw new Error('O serviço de busca está ocupado. Tente novamente.');
      const data = await response.json();
      const items = (data.elements || []).map((element) => { const lat = element.lat ?? element.center?.lat; const lon = element.lon ?? element.center?.lon; return { id: `osm-${element.type}-${element.id}`, lat, lon, tags: element.tags || {}, nome: getLabel(element.tags), categoria: getCategory(element.tags), endereco: getAddress(element.tags), telefone: getPhone(element.tags), score: opportunityScore(element.tags) }; }).filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lon));
      const unique = Array.from(new Map(items.map((item) => [item.id, item])).values()); setResults(unique); renderMarkers(unique); setSelected(unique[0] || null); setMessage(`${unique.length} estabelecimentos encontrados nesta área.`);
    } catch (error) { setMessage(error?.message || 'Não foi possível buscar estabelecimentos.'); } finally { setSearching(false); }
  };

  const searchAddress = async () => {
    if (!query.trim()) return; setSearching(true); setMessage('');
    try { const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`, { headers: { 'Accept-Language': 'pt-BR' } }); const data = await response.json(); if (!data.length) throw new Error('Local não encontrado.'); const lat = Number(data[0].lat); const lon = Number(data[0].lon); mapRef.current?.setView([lat, lon], 15); await scanNearby(lat, lon); } catch (error) { setMessage(error?.message || 'Não foi possível localizar a região.'); setSearching(false); }
  };
  const useMyLocation = () => { if (!navigator.geolocation) { setMessage('Localização não disponível neste aparelho.'); return; } setSearching(true); navigator.geolocation.getCurrentPosition(({ coords }) => { mapRef.current?.setView([coords.latitude, coords.longitude], 16); scanNearby(coords.latitude, coords.longitude); }, () => { setSearching(false); setMessage('Não foi possível acessar sua localização.'); }, { enableHighAccuracy: true, timeout: 12000 }); };

  const addProspect = (item = selected) => { if (!item) return; if (prospects.some((p) => p.sourceId === item.id)) { setMessage('Este estabelecimento já está no seu radar.'); return; } const prospect = { id: crypto.randomUUID(), sourceId: item.id, nome: item.nome, categoria: item.categoria, endereco: item.endereco, telefone: item.telefone, lat: item.lat, lon: item.lon, score: item.score, status: 'Novo', observacoes: '', criadoEm: new Date().toISOString() }; persist([prospect, ...prospects]); setMessage(`${item.nome} adicionado ao Radar Solar.`); };
  const updateProspect = (id, changes) => persist(prospects.map((item) => item.id === id ? { ...item, ...changes } : item));
  const removeProspect = (id) => { if (window.confirm('Excluir esta oportunidade do Radar Solar?')) persist(prospects.filter((item) => item.id !== id)); };
  const filtered = useMemo(() => prospects.filter((item) => (filter === 'todos' || item.status === filter) && (!term.trim() || `${item.nome} ${item.endereco} ${item.categoria}`.toLowerCase().includes(term.toLowerCase()))), [prospects, filter, term]);
  const openRoute = (item) => window.open(`https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lon}`, '_blank', 'noopener,noreferrer');
  const openWhatsapp = (item) => { let phone = cleanPhone(item.telefone); if (!phone) return; if (phone.length <= 11) phone = `55${phone}`; const text = encodeURIComponent(`Olá, tudo bem? Sou da MM Energia Solar e gostaria de conversar sobre economia de energia para ${item.nome}.`); window.location.href = /Android/i.test(navigator.userAgent) ? `intent://send?phone=${phone}&text=${text}#Intent;scheme=whatsapp;package=com.whatsapp.w4b;end` : `https://wa.me/${phone}?text=${text}`; };

  return <FinanceLayout title="Radar Solar" subtitle="Mapeie empresas, encontre telhados com potencial e organize sua prospecção em campo.">
    <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}><button type="button" className="finance-button" onClick={() => setTab('mapa')} style={{ opacity: tab === 'mapa' ? 1 : 0.65 }}><Radar size={18} /> Explorar mapa</button><button type="button" className="finance-button" onClick={() => setTab('pipeline')} style={{ opacity: tab === 'pipeline' ? 1 : 0.65 }}><Building2 size={18} /> Meu radar ({prospects.length})</button></div>
    {tab === 'mapa' && <><section className="finance-panel" style={{ marginBottom: 14 }}><div className="finance-form" style={{ alignItems: 'end' }}><label className="finance-field finance-field-wide"><span>Cidade, bairro, CEP ou endereço</span><div style={{ display: 'flex', gap: 8 }}><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') searchAddress(); }} placeholder="Ex.: Distrito Industrial, Bauru - SP" /></div></label><label className="finance-field"><span>Segmento</span><select value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map(([label, value]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="finance-field"><span>Raio de busca</span><select value={radius} onChange={(e) => setRadius(Number(e.target.value))}><option value={1000}>1 km</option><option value={2500}>2,5 km</option><option value={5000}>5 km</option><option value={10000}>10 km</option></select></label><div className="finance-actions"><button type="button" className="finance-button" onClick={searchAddress} disabled={searching}><Search size={18} /> Localizar e buscar</button><button type="button" onClick={useMyLocation} disabled={searching}><LocateFixed size={18} /> Minha localização</button><button type="button" onClick={() => scanNearby()} disabled={searching}><RefreshCw size={18} /> Buscar nesta tela</button></div></div>{message && <p className="finance-notice" style={{ marginTop: 10 }}>{message}</p>}</section>
      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 360px)', gap: 14 }} className="radar-map-layout"><div className="finance-panel" style={{ padding: 8, minHeight: 560, position: 'relative', overflow: 'hidden' }}>{loadingMap && <div className="finance-empty">Carregando mapa...</div>}<div ref={mapNode} style={{ width: '100%', height: 544, borderRadius: 14, background: '#e8eef5' }} /><div style={{ position: 'absolute', left: 20, bottom: 20, zIndex: 500, background: 'white', borderRadius: 10, padding: '8px 10px', boxShadow: '0 4px 18px rgba(0,0,0,.18)', fontSize: 12 }}><Crosshair size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />{results.length} pontos encontrados</div></div><aside className="finance-panel" style={{ maxHeight: 560, overflowY: 'auto' }}><div className="finance-panel-header"><div><h2>Oportunidades da região</h2><p>Selecione um ponto para avaliar e cadastrar.</p></div></div>{selected && <article style={{ border: '1px solid #dce5ef', borderRadius: 14, padding: 14, marginBottom: 14, background: '#f8fafc' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><strong>{selected.nome}</strong><span style={{ background: selected.score >= 80 ? '#dcfce7' : '#fef3c7', color: selected.score >= 80 ? '#166534' : '#92400e', borderRadius: 999, padding: '3px 8px', fontSize: 12 }}>{selected.score}% potencial</span></div><p style={{ margin: '8px 0 4px', color: '#64748b' }}><MapPin size={14} /> {selected.endereco || 'Endereço não informado no mapa'}</p><small>{selected.categoria}</small><div className="finance-actions" style={{ marginTop: 12 }}><button type="button" className="finance-button" onClick={() => addProspect()}><Plus size={16} /> Adicionar ao radar</button><button type="button" onClick={() => openRoute(selected)}><Navigation size={16} /> Rota</button></div></article>}<div style={{ display: 'grid', gap: 8 }}>{results.slice(0, 60).map((item) => <button type="button" key={item.id} onClick={() => { setSelected(item); mapRef.current?.panTo([item.lat, item.lon]); }} style={{ textAlign: 'left', border: selected?.id === item.id ? '2px solid #0b2f55' : '1px solid #dce5ef', borderRadius: 12, padding: 10, background: '#fff' }}><strong style={{ display: 'block' }}>{item.nome}</strong><small>{item.categoria} · potencial {item.score}%</small></button>)}</div>{!results.length && <div className="finance-empty">Pesquise uma região para encontrar empresas e imóveis comerciais.</div>}</aside></section></>}
    {tab === 'pipeline' && <section className="finance-panel"><div className="finance-panel-header"><div><h2>Meu Radar Solar</h2><p>Controle abordagens, visitas e oportunidades convertidas.</p></div></div><div className="finance-dashboard-grid" style={{ marginBottom: 16 }}>{STATUS.slice(0, 5).map((s) => <article className="finance-kpi-card" key={s}><span>{s}</span><strong>{prospects.filter((p) => p.status === s).length}</strong><small>oportunidades</small></article>)}</div><div className="finance-form"><label className="finance-field"><span>Pesquisar</span><input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Empresa, endereço ou segmento" /></label><label className="finance-field"><span>Status</span><select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="todos">Todos</option>{STATUS.map((s) => <option key={s}>{s}</option>)}</select></label></div><div style={{ display: 'grid', gap: 12, marginTop: 14 }}>{filtered.map((item) => <article className="finance-list-item" key={item.id}><div><strong><Building2 size={17} /> {item.nome}</strong><span><MapPin size={14} /> {item.endereco || 'Localização salva no mapa'}</span><span>{item.categoria} · potencial estimado {item.score}%</span><textarea rows="2" value={item.observacoes || ''} onChange={(e) => updateProspect(item.id, { observacoes: e.target.value })} placeholder="Anotações da abordagem" style={{ marginTop: 8, width: '100%' }} /></div><div className="finance-actions"><select value={item.status} onChange={(e) => updateProspect(item.id, { status: e.target.value })} style={{ borderColor: statusColor[item.status] }}>{STATUS.map((s) => <option key={s}>{s}</option>)}</select>{item.telefone && <button type="button" onClick={() => openWhatsapp(item)}><Phone size={16} /> WhatsApp</button>}<button type="button" onClick={() => openRoute(item)}><Navigation size={16} /> Rota</button><button type="button" onClick={() => window.open(`https://www.openstreetmap.org/?mlat=${item.lat}&mlon=${item.lon}#map=19/${item.lat}/${item.lon}`, '_blank')}><ExternalLink size={16} /> Mapa</button><button type="button" className="finance-delete" onClick={() => removeProspect(item.id)}><Trash2 size={16} /> Excluir</button></div></article>)}{!filtered.length && <div className="finance-empty">Nenhuma oportunidade cadastrada neste filtro.</div>}</div></section>}
    <style>{`@media (max-width: 900px){.radar-map-layout{grid-template-columns:1fr!important}.radar-map-layout aside{max-height:none!important}} .leaflet-container{font-family:inherit}`}</style>
  </FinanceLayout>;
}
