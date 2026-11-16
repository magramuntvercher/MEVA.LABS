(() => {
const cfg = window.MEVA_EVENTOS_CONFIG;
const rowsEl = document.getElementById('orderRows');
const summaryEl = document.getElementById('orderSummary');
const totalEl = document.getElementById('grandTotal');
const addBtn = document.getElementById('addProduct');
const waBtn = document.getElementById('sendOrder');
let rowId = 0;

const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => n.toLocaleString('es-ES',{style:'currency',currency:'EUR'});
const getTier = (p,q) => p.tiers.find(t=>q>=t.min && q<=t.max);

function productOptions(){
  return Object.entries(cfg.products).map(([id,p])=>`<option value="${escapeHTML(id)}">${escapeHTML(p.name)}</option>`).join('');
}
function packagingOptions(){
  return cfg.packaging.map(p=>`<option value="${escapeHTML(p.id)}">${escapeHTML(p.label)}${p.extra?` (+${money(p.extra)}/ud.)`:''}</option>`).join('');
}
function personalizationOptions(product){
  return product.personalization.map(p=>`<option value="${escapeHTML(p.id)}">${escapeHTML(p.label)}${p.extra?` (+${money(p.extra)}/ud.)`:''}</option>`).join('');
}
function addRow(productId=Object.keys(cfg.products)[0]){
  const id=++rowId;
  const row=document.createElement('div');
  row.className='event-row'; row.dataset.row=id;
  row.innerHTML=`
    <div class="event-row-head"><strong>Producto</strong><button type="button" class="remove-row" aria-label="Eliminar producto">×</button></div>
    <div class="event-fields">
      <label>Producto<select class="f-product">${productOptions()}</select></label>
      <label>Cantidad<input class="f-qty" type="number" min="${cfg.minQuantity}" max="${cfg.maxAutoQuantity}" value="${cfg.minQuantity}"></label>
      <label>Tejido<input class="f-fabric" type="text" placeholder="Ej. Vichy coral"></label>
      <label>Personalización<select class="f-personal"></select></label>
      <label>Packaging<select class="f-pack">${packagingOptions()}</select></label>
    </div>
    <div class="line-price"><span>Precio por unidad: <b class="unit-price">—</b></span><span>Subtotal: <b class="subtotal">—</b></span></div>
    <div class="row-warning" hidden></div>`;
  rowsEl.appendChild(row);
  row.querySelector('.f-product').value=productId;
  refreshPersonal(row);
  row.addEventListener('input',(event)=>{ if(event?.target?.classList?.contains('f-product')) refreshPersonal(row); recalc(); });
  row.addEventListener('change',(event)=>{ if(event?.target?.classList?.contains('f-product')) refreshPersonal(row); recalc(); });
  row.querySelector('.remove-row').addEventListener('click',()=>{row.remove(); if(!rowsEl.children.length)addRow(); recalc();});
  recalc();
}
function refreshPersonal(row){
  const pid=row.querySelector('.f-product').value;
  const p=cfg.products[pid];
  row.querySelector('.f-personal').innerHTML=personalizationOptions(p);
}
function rowData(row){
  const pid=row.querySelector('.f-product').value;
  const p=cfg.products[pid];
  const q=Number(row.querySelector('.f-qty').value)||0;
  const tier=getTier(p,q);
  const personalId=row.querySelector('.f-personal').value;
  const personal=p.personalization.find(x=>x.id===personalId)||p.personalization[0];
  const packId=row.querySelector('.f-pack').value;
  const pack=cfg.packaging.find(x=>x.id===packId)||cfg.packaging[0];
  const fabric=row.querySelector('.f-fabric').value.trim();
  const valid=!!tier && q>=cfg.minQuantity && q<=cfg.maxAutoQuantity;
  const base=tier?tier.price:0;
  const unit=valid?base+personal.extra+pack.extra:0;
  const subtotal=valid?unit*q:0;
  return {pid,p,q,tier,personal,pack,fabric,valid,base,unit,subtotal};
}
function recalc(){
  const rows=[...rowsEl.querySelectorAll('.event-row')];
  let total=0; let allValid=true;
  const items=[];
  rows.forEach(row=>{
    const d=rowData(row); items.push(d);
    const warn=row.querySelector('.row-warning');
    if(!d.valid){
      allValid=false; warn.hidden=false;
      warn.textContent=d.q<cfg.minQuantity?`Mínimo ${cfg.minQuantity} unidades por producto y variante.`:`Para más de ${cfg.maxAutoQuantity} unidades, solicita presupuesto personalizado.`;
      if(d.q>=cfg.minQuantity && d.q<=cfg.maxAutoQuantity) warn.textContent='No hay tarifa para esta cantidad. Consulta un presupuesto personalizado.';
      row.querySelector('.unit-price').textContent='—'; row.querySelector('.subtotal').textContent='—';
    } else {
      warn.hidden=true; total+=d.subtotal;
      row.querySelector('.unit-price').textContent=money(d.unit);
      row.querySelector('.subtotal').textContent=money(d.subtotal);
    }
  });
  summaryEl.innerHTML=items.map(d=>`<div class="summary-line"><span>${escapeHTML(d.p.name)} · ${d.q||0} ud.</span><b>${d.valid?money(d.subtotal):'Revisar cantidad'}</b></div>`).join('') || '<p>Añade productos para calcular tu pedido.</p>';
  totalEl.textContent=money(total);
  waBtn.disabled=!allValid || !items.length;
}
function buildWhatsApp(){
  const rows=[...rowsEl.querySelectorAll('.event-row')].map(rowData);
  if(!rows.length || rows.some(r=>!r.valid)) return;
  const date=document.getElementById('eventDate').value;
  const notes=document.getElementById('eventNotes').value.trim();
  let total=0;
  const lines=['Hola MEVA 👋','Quiero consultar este pedido para un evento:',''];
  rows.forEach((d,i)=>{
    total+=d.subtotal;
    lines.push(`${i+1}. ${d.p.name}`);
    lines.push(`Cantidad: ${d.q} unidades`);
    lines.push(`Tejido: ${d.fabric||'Por elegir'}`);
    lines.push(`Personalización: ${d.personal.label}`);
    lines.push(`Packaging: ${d.pack.label}`);
    lines.push(`Precio por unidad: ${money(d.unit)}`);
    lines.push(`Subtotal: ${money(d.subtotal)}`,'');
  });
  lines.push(`TOTAL ESTIMADO: ${money(total)}`);
  if(date) lines.push(`Fecha del evento: ${date.split('-').reverse().join('/')}`);
  if(notes) lines.push(`Observaciones: ${notes}`);
  lines.push('','Entiendo que disponibilidad de tejidos, plazo de producción y gastos de envío están sujetos a confirmación.');
  window.open(`https://wa.me/${window.MEVA_GENERAL.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`,'_blank');
}
addBtn.addEventListener('click',()=>addRow());
waBtn.addEventListener('click',buildWhatsApp);
if(Object.keys(cfg.products).length){
  addRow();
} else {
  rowsEl.textContent='No hay productos de eventos disponibles.';
  addBtn.disabled=true; waBtn.disabled=true;
}
})();