/* ── DATA ── */
const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const hoje = new Date();
document.getElementById('data-atual').textContent =
  `Praia Grande, ${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;

const dataInput = document.getElementById('f-data');
dataInput.value = hoje.toISOString().split('T')[0];
dataInput.classList.add('filled');

/* ── PROGRESSO ── */
const TOTAL_STEPS = 6;
function atualizarProgresso(){
  let filled = 0;
  if(document.getElementById('f-razao').value.trim()) filled++;
  if(document.getElementById('f-resp').value.trim()) filled++;
  if(document.getElementById('f-tel').value.trim()) filled++;
  if(document.getElementById('f-email').value.trim()) filled++;
  if(planoSelecionado) filled++;
  if(smallPad.hasSig) filled++;
  const pct = Math.round(filled / TOTAL_STEPS * 100);
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-label').textContent = filled + ' / ' + TOTAL_STEPS;
}

/* ── VALIDAÇÃO ── */
function validarTelefone(val){
  return /^\(?\d{2}\)?[\s-]?\d{4,5}[-]?\d{4}$/.test(val.replace(/\s/g,''));
}
function validarEmail(val){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
}

document.querySelectorAll('.field-input').forEach(inp => {
  inp.addEventListener('input', () => {
    const val = inp.value.trim();
    inp.classList.toggle('filled', !!val);
    if(inp.id === 'f-tel'){
      const err = document.getElementById('err-tel');
      if(val && !validarTelefone(val)){ inp.classList.add('invalid'); err.classList.add('show'); }
      else { inp.classList.remove('invalid'); err.classList.remove('show'); }
    }
    if(inp.id === 'f-email'){
      const err = document.getElementById('err-email');
      if(val && !validarEmail(val)){ inp.classList.add('invalid'); err.classList.add('show'); }
      else { inp.classList.remove('invalid'); err.classList.remove('show'); }
    }
    if(inp.id === 'f-resp' && !document.getElementById('f-sig-nome').dataset.touched){
      const sn = document.getElementById('f-sig-nome');
      sn.value = inp.value;
      sn.classList.toggle('filled', !!inp.value.trim());
    }
    atualizarProgresso();
  });
});
document.getElementById('f-sig-nome').addEventListener('input', function(){ this.dataset.touched = '1'; });
document.getElementById('f-data').addEventListener('change', function(){
  this.classList.toggle('filled', !!this.value);
  atualizarProgresso();
});

/* ── PLANOS ── */
let planoSelecionado = null;
function selecionarPlano(row){
  document.querySelectorAll('.plano-row').forEach(r => {
    r.classList.remove('selected');
  });
  row.classList.add('selected');
  planoSelecionado = row.dataset.plano;

  document.getElementById('plano-hint-select').classList.add('hidden');
  document.getElementById('plano-hint-ok').classList.remove('hidden');
  document.getElementById('plano-nome-hint').textContent = planoSelecionado;

  const resumo = document.getElementById('plano-resumo');
  resumo.classList.add('visible');
  document.getElementById('resumo-val').textContent = planoSelecionado + ' — Setup: ' + row.dataset.setup;
  document.getElementById('resumo-sub').textContent = 'Mensalidade: ' + row.dataset.mensalidade;

  document.querySelectorAll('.entrega-item').forEach(item => {
    const planos = item.dataset.planos.split(',');
    item.classList.toggle('locked', !planos.includes(planoSelecionado));
  });

  document.getElementById('val-plano').classList.remove('show');
  atualizarProgresso();
}

/* ════════════════════════════════════════════
   ENGINE DE ASSINATURA SUAVE (curvas Bézier)
   ════════════════════════════════════════════ */
const DPR = window.devicePixelRatio || 1;

class SmoothPad {
  constructor(canvas, strokeWidth, color){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sw = strokeWidth || 2.5;
    this.color = color || '#0F172A';
    this.pts = [];
    this.drawing = false;
    this.hasSig = false;
    this._bind();
  }
  _bind(){
    const c = this.canvas;
    c.addEventListener('mousedown',  e => this._start(e));
    c.addEventListener('mousemove',  e => this._move(e));
    c.addEventListener('mouseup',    ()=> this._end());
    c.addEventListener('mouseleave', ()=> this._end());
    c.addEventListener('touchstart', e => { e.preventDefault(); this._start(e.touches[0]); }, { passive:false });
    c.addEventListener('touchmove',  e => { e.preventDefault(); this._move(e.touches[0]); },  { passive:false });
    c.addEventListener('touchend',   ()=> this._end());
  }
  _pos(e){
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  _start(e){
    this.drawing = true;
    const p = this._pos(e);
    this.pts = [p, p];
    this.ctx.beginPath();
    this.ctx.moveTo(p.x, p.y);
  }
  _move(e){
    if(!this.drawing) return;
    const p = this._pos(e);
    this.pts.push(p);
    if(this.pts.length >= 3) this._curve();
    if(!this.hasSig){ this.hasSig = true; this.onFirst(); }
  }
  _end(){ this.drawing = false; this.pts = []; }
  _curve(){
    const pts = this.pts, l = pts.length, ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(pts[l-3].x, pts[l-3].y);
    const cp1x = (pts[l-3].x + pts[l-2].x) / 2;
    const cp1y = (pts[l-3].y + pts[l-2].y) / 2;
    const cp2x = (pts[l-2].x + pts[l-1].x) / 2;
    const cp2y = (pts[l-2].y + pts[l-1].y) / 2;
    ctx.bezierCurveTo(cp1x, cp1y, pts[l-2].x, pts[l-2].y, cp2x, cp2y);
    ctx.strokeStyle = this.color;
    ctx.lineWidth   = this.sw;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.stroke();
  }
  onFirst(){ /* sobrescrever */ }
  clear(){
    const c = this.canvas;
    this.ctx.clearRect(0, 0, c.width / DPR, c.height / DPR);
    this.hasSig = false;
  }
  resize(){
    const c = this.canvas;
    const r = c.parentElement.getBoundingClientRect();
    const h = c.clientHeight || 100;
    const tmp = document.createElement('canvas');
    tmp.width = c.width; tmp.height = c.height;
    tmp.getContext('2d').drawImage(c, 0, 0);
    c.width  = r.width * DPR;
    c.height = h * DPR;
    this.ctx.scale(DPR, DPR);
    this.ctx.drawImage(tmp, 0, 0, r.width, h);
  }
  initSize(h){
    const c = this.canvas;
    const r = c.parentElement.getBoundingClientRect();
    c.width  = r.width * DPR;
    c.height = (h || 100) * DPR;
    c.style.width  = r.width + 'px';
    c.style.height = (h || 100) + 'px';
    this.ctx.scale(DPR, DPR);
  }
  getDataURL(){ return this.canvas.toDataURL(); }
}

/* ── PAD PEQUENO ── */
const smallCanvas = document.getElementById('sig-canvas');
const smallPad    = new SmoothPad(smallCanvas, 2.2, '#0F172A');

smallPad.onFirst = function(){
  document.getElementById('sig-placeholder').classList.add('hide');
  document.getElementById('sig-area').classList.add('has-sig');
  document.getElementById('sig-status').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Assinatura adicionada';
  document.getElementById('sig-status').className = 'sig-status-text done';
  document.getElementById('btn-sig-clear').classList.add('show');
  document.getElementById('val-sig').classList.remove('show');
  atualizarProgresso();
};

function clearSmall(){
  smallPad.clear();
  document.getElementById('sig-placeholder').classList.remove('hide');
  document.getElementById('sig-area').classList.remove('has-sig');
  document.getElementById('sig-status').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Aguardando assinatura';
  document.getElementById('sig-status').className = 'sig-status-text';
  document.getElementById('btn-sig-clear').classList.remove('show');
  atualizarProgresso();
}

/* ── PAD MODAL ── */
const modalCanvas = document.getElementById('sig-modal-canvas');
const modalPad    = new SmoothPad(modalCanvas, 3, '#0F172A');

modalPad.onFirst = function(){
  document.getElementById('sig-modal-placeholder').classList.add('hide');
  document.getElementById('sig-modal-wrap').classList.add('has-sig');
  document.getElementById('btn-modal-confirmar').disabled = false;
};

function clearModal(){
  modalPad.clear();
  document.getElementById('sig-modal-placeholder').classList.remove('hide');
  document.getElementById('sig-modal-wrap').classList.remove('has-sig');
  document.getElementById('btn-modal-confirmar').disabled = true;
}

/* ── MODAL ABRIR / FECHAR ── */
function abrirModal(){
  document.getElementById('sig-modal-overlay').classList.add('open');
  setTimeout(()=>{
    modalPad.initSize(240);
    /* copia a assinatura existente para o modal, se houver */
    if(smallPad.hasSig && !modalPad.hasSig){
      const img = new Image();
      img.src = smallPad.getDataURL();
      img.onload = ()=>{
        const r = modalCanvas.parentElement.getBoundingClientRect();
        modalPad.ctx.drawImage(img, 0, 0, r.width, 240);
        modalPad.hasSig = true;
        document.getElementById('sig-modal-placeholder').classList.add('hide');
        document.getElementById('sig-modal-wrap').classList.add('has-sig');
        document.getElementById('btn-modal-confirmar').disabled = false;
      };
    }
  }, 60);
}

function fecharModal(){
  document.getElementById('sig-modal-overlay').classList.remove('open');
}

/* fecha clicando fora */
document.getElementById('sig-modal-overlay').addEventListener('click', function(e){
  if(e.target === this) fecharModal();
});

/* ── CONFIRMAR (modal → pequeno) ── */
function confirmarSig(){
  const r = smallCanvas.parentElement.getBoundingClientRect();
  const h = 100;
  smallCanvas.width  = r.width * DPR;
  smallCanvas.height = h * DPR;
  smallCanvas.style.width  = r.width + 'px';
  smallCanvas.style.height = h + 'px';
  const ctx = smallCanvas.getContext('2d');
  ctx.scale(DPR, DPR);

  const img = new Image();
  img.src = modalPad.getDataURL();
  img.onload = ()=>{
    ctx.drawImage(img, 0, 0, r.width, h);
    smallPad.hasSig = true;
    smallPad.ctx = ctx;
    document.getElementById('sig-placeholder').classList.add('hide');
    document.getElementById('sig-area').classList.add('has-sig');
    document.getElementById('sig-status').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Assinatura adicionada';
    document.getElementById('sig-status').className = 'sig-status-text done';
    document.getElementById('btn-sig-clear').classList.add('show');
    document.getElementById('val-sig').classList.remove('show');
    atualizarProgresso();
  };
  fecharModal();
}

/* ── EXPORTAR PDF ── */
function exportarPDF(){
  let valido = true;
  if(!planoSelecionado){ document.getElementById('val-plano').classList.add('show'); valido = false; }

  const telVal = document.getElementById('f-tel').value.trim();
  if(telVal && !validarTelefone(telVal)){
    document.getElementById('err-tel').classList.add('show');
    document.getElementById('f-tel').classList.add('invalid');
    valido = false;
  }
  const emailVal = document.getElementById('f-email').value.trim();
  if(emailVal && !validarEmail(emailVal)){
    document.getElementById('err-email').classList.add('show');
    document.getElementById('f-email').classList.add('invalid');
    valido = false;
  }
  if(!smallPad.hasSig || !document.getElementById('f-data').value){
    document.getElementById('val-sig').classList.add('show');
    valido = false;
  }
  if(!valido){
    document.querySelector('.validation-tip.show').scrollIntoView({ behavior:'smooth', block:'center' });
    return;
  }
  window.print();
}

/* ── RESIZE ── */
window.addEventListener('load', ()=> smallPad.initSize(100));
window.addEventListener('resize', ()=> smallPad.resize());
