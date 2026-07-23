import React from 'react';

function LeadForm() {
  var [etapa, setEtapa] = React.useState(1);
  var [v, setV] = React.useState({n:'', e:'', es:'', ci:'', w:'', cpf:'', c:'', t:'On-Grid', aceita:false});
  var [res, setRes] = React.useState(null);
  var [loading, setLoading] = React.useState(false);

  // URL do seu Google Apps Script (Planilha)
  var scriptURL = "https://script.google.com/macros/s/AKfycby21q8ZOy6AV3kIgQrbtTC3hngf7YF5QRHhX8OLaKkk-DxMZp9J9rCmPkNTN7uFKKQOxA/exec";

  function proxima( ) { 
    if (etapa === 1 && !v.c) { alert("Informe o valor da conta."); return; }
    if (etapa === 2 && (!v.es || !v.ci)) { alert("Informe estado e cidade."); return; }
    setEtapa(etapa + 1); 
  }
  function voltar() { setEtapa(etapa - 1); }

  function enviarParaPlanilha(e) {
    e.preventDefault();
    setLoading(true);
    
    var consumo = Number(v.c) / 0.9;
    var potencia = (v.t === "Hibrido") ? (consumo / 130) * 1.15 : (consumo / 130);
    var bateria = (v.t === "Hibrido") ? Math.max(3, ((consumo / 30 * 0.5 / 24) * 5)).toFixed(1) : "0";
    var placas = Math.ceil((potencia * 1000) / 620);
    var economia = (Number(v.c) * 0.9).toFixed(0);

    var params = "?nome="+encodeURIComponent(v.n)+"&email="+encodeURIComponent(v.e)+"&estado="+encodeURIComponent(v.es)+
                 "&cidade="+encodeURIComponent(v.ci)+"&whatsapp="+encodeURIComponent(v.w)+"&cpf="+encodeURIComponent(v.cpf)+
                 "&valor_conta="+v.c+"&tipo_sistema="+v.t+"&consumo="+consumo.toFixed(0)+
                 "&potencia="+potencia.toFixed(2)+"&placas="+placas+"&bateria="+bateria+"&economia="+economia;
    
    // Salva na planilha silenciosamente
    fetch(scriptURL + params, { mode: 'no-cors' }).then(function() {
      setRes({p: potencia.toFixed(2), q: placas, b: bateria, e: economia});
      setLoading(false);
    });
  }

  function acaoWhatsApp() {
    // DISPARA O EVENTO LEAD NO PIXEL DO META APENAS NO CLIQUE DO WHATSAPP
    if (window.fbq) {
      window.fbq('track', 'Lead', {
        content_name: 'Contato WhatsApp Calculadora',
        value: parseFloat(v.c) || 0,
        currency: 'BRL'
      });
    }
    
    // Abre o WhatsApp com a mensagem personalizada
    var texto = "Olá! Fiz a simulação no site e quero minha proposta personalizada para economizar R$ " + res.e + " por mês!";
    window.open('https://wa.me/5514998641415?text=' + encodeURIComponent(texto ));
  }

  if (res) {
    return (
      <div style={{background:'#fff', borderRadius:'15px', padding:'30px', boxShadow:'0 10px 30px rgba(0,0,0,0.1)', textAlign:'center', fontFamily:'sans-serif', maxWidth:'500px', margin:'auto'}}>
        <h2 style={{color:'#1a202c'}}>Simulação Concluída! ☀️</h2>
        <div style={{background:'#f0f9ff', padding:'20px', borderRadius:'10px', margin:'20px 0', border:'1px solid #bae6fd'}}>
          <p style={{margin:'10px 0'}}>Potência: <b>{res.p} kWp</b></p>
          <p style={{margin:'10px 0'}}>Placas (620W): <b>{res.q} unidades</b></p>
          {v.t === "Hibrido" && <p style={{margin:'10px 0'}}>Bateria: <b>{res.b} kWh</b></p>}
          <p style={{fontSize:'1.8rem', color:'#16a34a', fontWeight:'bold', margin:'15px 0'}}>Economia: R$ {res.e}/mês</p>
        </div>
        
        <button 
          onClick={acaoWhatsApp} 
          style={{width:'100%', padding:'18px', background:'#25D366', color:'#fff', border:'none', borderRadius:'8px', fontWeight:'bold', fontSize:'1.1rem', cursor:'pointer'}}
        >
          FALAR NO WHATSAPP E RECEBER PROPOSTA 🚀
        </button>
        
        <button onClick={function(){ setRes(null); setEtapa(1); setV({n:'', e:'', es:'', ci:'', w:'', cpf:'', c:'', t:'On-Grid', aceita:false}); }} style={{marginTop:'15px', background:'none', border:'none', color:'#666', cursor:'pointer', textDecoration:'underline'}}>
          Fazer nova simulação
        </button>
      </div>
    );
  }

  return (
    <div style={{background:'#fff', borderRadius:'15px', padding:'30px', boxShadow:'0 10px 30px rgba(0,0,0,0.1)', fontFamily:'sans-serif', maxWidth:'500px', margin:'auto'}}>
      <div style={{background:'#eee', height:'8px', borderRadius:'4px', marginBottom:'25px'}}>
        <div style={{background:'#667eea', height:'100%', width: (etapa*33.3)+'%', borderRadius:'4px', transition:'0.5s'}}></div>
      </div>

      {etapa === 1 && (
        <div>
          <h3 style={{color:'#333', marginBottom:'10px'}}>Qual o valor da sua conta?</h3>
          <input type="number" placeholder="Valor em R$" onChange={function(e){ setV(Object.assign({}, v, {c:e.target.value})) }} style={{width:'100%', padding:'15px', borderRadius:'8px', border:'1px solid #ddd', fontSize:'1.1rem', boxSizing:'border-box', marginBottom:'20px'}} />
          <button onClick={proxima} style={{width:'100%', padding:'15px', background:'#667eea', color:'#fff', border:'none', borderRadius:'8px', fontWeight:'bold', fontSize:'1rem', cursor:'pointer'}}>Próximo Passo →</button>
        </div>
      )}

      {etapa === 2 && (
        <div>
          <h3 style={{color:'#333', marginBottom:'10px'}}>Onde será instalado?</h3>
          <input placeholder="Estado (Ex: SP)" maxLength="2" onChange={function(e){ setV(Object.assign({}, v, {es:e.target.value.toUpperCase()})) }} style={{width:'100%', padding:'12px', borderRadius:'8px', border:'1px solid #ddd', marginBottom:'12px', boxSizing:'border-box'}} />
          <input placeholder="Cidade" onChange={function(e){ setV(Object.assign({}, v, {ci:e.target.value})) }} style={{width:'100%', padding:'12px', borderRadius:'8px', border:'1px solid #ddd', marginBottom:'20px', boxSizing:'border-box'}} />
          <div style={{display:'flex', gap:'10px'}}>
            <button onClick={voltar} style={{flex:1, padding:'12px', background:'#e2e8f0', border:'none', borderRadius:'8px', cursor:'pointer'}}>Voltar</button>
            <button onClick={proxima} style={{flex:1, padding:'12px', background:'#667eea', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'bold'}}>Próximo</button>
          </div>
        </div>
      )}

      {etapa === 3 && (
        <form onSubmit={enviarParaPlanilha}>
          <h3 style={{color:'#333', marginBottom:'10px'}}>Seus dados para a proposta:</h3>
          <input placeholder="Seu Nome" onChange={function(e){ setV(Object.assign({}, v, {n:e.target.value})) }} style={{width:'100%', padding:'12px', borderRadius:'8px', border:'1px solid #ddd', marginBottom:'12px', boxSizing:'border-box'}} required />
          <input placeholder="WhatsApp" onChange={function(e){ setV(Object.assign({}, v, {w:e.target.value})) }} style={{width:'100%', padding:'12px', borderRadius:'8px', border:'1px solid #ddd', marginBottom:'12px', boxSizing:'border-box'}} required />
          <select onChange={function(e){ setV(Object.assign({}, v, {t:e.target.value})) }} style={{width:'100%', padding:'12px', borderRadius:'8px', border:'1px solid #ddd', marginBottom:'15px', boxSizing:'border-box', background:'#fff'}}>
            <option value="On-Grid">Sistema On-Grid</option>
            <option value="Hibrido">Sistema Híbrido</option>
          </select>
          <label style={{fontSize:'0.85rem', color:'#666', display:'flex', alignItems:'flex-start', gap:'8px', marginBottom:'20px', cursor:'pointer'}}>
            <input type="checkbox" onChange={function(e){ setV(Object.assign({}, v, {aceita:e.target.checked})) }} required style={{marginTop:'3px'}} /> 
            Concordo em receber contato da MM Energia Solar.
          </label>
          <button type="submit" disabled={loading} style={{width:'100%', padding:'18px', background:'#FFD700', color:'#000', fontWeight:'bold', fontSize:'1.1rem', border:'none', borderRadius:'8px', cursor:'pointer'}}>
            {loading ? "PROCESSANDO..." : "VER MINHA ECONOMIA! 🚀"}
          </button>
        </form>
      )}
    </div>
  );
}

export default LeadForm;