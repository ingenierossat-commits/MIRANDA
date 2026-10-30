/* ============================================================
   MIRANDA TE AYUDA · demo interactiva · app.js v1.0
   Datos ficticios. El estado vive solo en memoria: al recargar
   se reinicia. (En la versión real los datos irán a Firebase.)
   ============================================================ */
'use strict';

/* ---------- constantes ---------- */
const DAY = 86400000, HOUR = 3600000;
const TIPOS = ['Electricidad', 'Fontanería', 'Antena / TV', 'Puerta / garaje', 'Otro'];
const ESTADOS = {
  abierto:    ['Recibido', 'b-blue'],
  camino:     ['Técnico en camino', 'b-blue'],
  aprobacion: ['Pendiente de aprobación', 'b-amber'],
  aprobado:   ['Aprobado · en curso', 'b-blue'],
  resuelto:   ['Resuelto', 'b-green']
};
const LIMITES = [0, 30, 60, 100, 150];

let S = null;
const UI = { view: 'familia', socio: 's1' };
const TMP = {};

/* ---------- utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const d2 = n => String(n).padStart(2, '0');
const fDate = d => `${d2(d.getDate())}/${d2(d.getMonth() + 1)}/${d.getFullYear()}`;
const fTime = d => `${d2(d.getHours())}:${d2(d.getMinutes())}`;
const fDT = d => `${fDate(d)} ${fTime(d)}`;
const eur = n => n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' €';
const fDur = ms => { const h = ms / HOUR; return h < 48 ? `${Math.max(1, Math.round(h))} h` : `${Math.round(h / 24)} días`; };
const socio = id => S.socios.find(s => s.id === id);
const inc = id => S.inc.find(i => i.id === id);
const obra = id => S.obras.find(o => o.id === id);

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2800);
}
function openModal(html) { $('#sheet').innerHTML = html; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); $('#sheet').innerHTML = ''; }

async function huella(str) {
  try {
    if (window.crypto && crypto.subtle) {
      const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) { /* cae al hash simple */ }
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ('00000000' + (h >>> 0).toString(16)).slice(-8).repeat(8);
}

/* ---------- fotos ---------- */
function placeholder(label, hue) {
  const c = document.createElement('canvas');
  c.width = 640; c.height = 420;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 640, 420);
  gr.addColorStop(0, `hsl(${hue},35%,62%)`);
  gr.addColorStop(1, `hsl(${hue},40%,36%)`);
  g.fillStyle = gr; g.fillRect(0, 0, 640, 420);
  g.fillStyle = 'rgba(255,255,255,.9)';
  g.textAlign = 'center';
  g.font = 'bold 36px sans-serif'; g.fillText(label, 320, 200);
  g.font = '20px sans-serif'; g.fillText('foto de ejemplo', 320, 240);
  return { url: c.toDataURL('image/jpeg', .85), w: 640, h: 420 };
}
function fileToPhoto(file, max = 900) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = () => rej(fr.error);
    fr.onload = () => {
      const im = new Image();
      im.onerror = () => rej(new Error('imagen no válida'));
      im.onload = () => {
        const k = Math.min(1, max / Math.max(im.width, im.height));
        const c = document.createElement('canvas');
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        const g = c.getContext('2d');
        g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
        g.drawImage(im, 0, 0, c.width, c.height);
        res({ url: c.toDataURL('image/jpeg', .82), w: c.width, h: c.height });
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

/* ---------- datos de ejemplo ---------- */
function nextTue() {
  const d = new Date(); d.setHours(10, 30, 0, 0);
  d.setDate(d.getDate() + ((2 - d.getDay() + 7) % 7 || 7));
  return d;
}
function seed() {
  const t = (d, h = 0) => new Date(Date.now() - d * DAY - h * HOUR);
  const fut = d => new Date(Date.now() + d * DAY);
  const mk = o => Object.assign({
    urgencia: 'normal', trabajo: '', material: [], coste: 0, fotoAntes: null, fotoDespues: null,
    aprobacion: null, autorizada: null, presupuesto: null, fuera: false, resuelta: null, camino: null
  }, o);

  const socios = [
    { id: 's1', nombre: 'Carmen Ruiz', pueblo: 'Villar de Abajo', hijo: 'Laura Ruiz', tel: '•••• 123', limite: 60, total: 6, desde: t(210), entrega: true },
    { id: 's2', nombre: 'Antonio Gómez', pueblo: 'San Martín del Llano', hijo: 'Pablo Gómez', tel: '•••• 481', limite: 30, total: 6, desde: t(95), entrega: true },
    { id: 's3', nombre: 'Dolores Martín', pueblo: 'Torre de Arriba', hijo: 'Marta Pérez', tel: '•••• 905', limite: 100, total: 6, desde: t(30), entrega: false }
  ];

  const c1 = t(20, 3), c2 = t(8, 5);
  const incs = [
    mk({ id: 'MTA-0001', socio: 's1', tipo: 'Electricidad', desc: 'El enchufe del salón no da corriente', creada: c1, estado: 'resuelto',
         resuelta: new Date(c1.getTime() + 22 * HOUR), trabajo: 'Sustituida la base de enchufe quemada y revisado el magnetotérmico del circuito.',
         material: [{ n: 'Base de enchufe 16 A', c: 6.5 }], coste: 6.5, autorizada: 'limite',
         fotoAntes: placeholder('Foto antes', 20), fotoDespues: placeholder('Foto después', 150) }),
    mk({ id: 'MTA-0002', socio: 's1', tipo: 'Antena / TV', desc: 'La tele no se ve desde ayer', creada: c2, estado: 'resuelto',
         resuelta: new Date(c2.getTime() + 30 * HOUR), trabajo: 'Reorientada la antena y cambiado el conector del cable coaxial.',
         material: [{ n: 'Conector F', c: 3.2 }], coste: 3.2, autorizada: 'limite',
         fotoAntes: placeholder('Foto antes', 210), fotoDespues: placeholder('Foto después', 150) }),
    mk({ id: 'MTA-0003', socio: 's1', tipo: 'Fontanería', desc: 'El grifo de la cocina gotea', creada: t(1, 2), estado: 'abierto',
         fotoAntes: placeholder('Foto del aviso', 200) }),
    mk({ id: 'MTA-0004', socio: 's2', tipo: 'Puerta / garaje', desc: 'La puerta del garaje no abre con el mando', urgencia: 'urgente', creada: t(0, 5), estado: 'abierto' }),
    mk({ id: 'MTA-0005', socio: 's3', tipo: 'Electricidad', desc: 'La luz del pasillo parpadea', creada: t(2, 0), estado: 'camino', camino: t(0, 1) })
  ];

  const obras = [{
    id: 'OB-001', socio: 's1', titulo: 'Cambio de bañera por plato de ducha',
    desc: 'Retirada de la bañera, plato de ducha antideslizante, mampara y grifería. Incluye obra, material y retirada de escombros.',
    opciones: [
      { k: 'A', nombre: 'Plato extraplano + mampara fija', detalle: 'Plato de resina 120×70, mampara fija de cristal templado, grifo monomando.', importe: 1450 },
      { k: 'B', nombre: 'Opción A + asiento y barra de apoyo', detalle: 'Incluye asiento abatible, barra de apoyo y grifo termostático.', importe: 1890 }
    ],
    validez: fut(14), estado: 'pendiente', eleccion: null, aceptacion: null
  }];

  const ent = [
    { id: 'E1', socio: 's1', estado: 'entregada', fecha: t(7, 0), prevista: t(7, 0) },
    { id: 'E2', socio: 's1', estado: 'pendiente', fecha: null, prevista: nextTue() },
    { id: 'E3', socio: 's2', estado: 'pendiente', fecha: null, prevista: nextTue() }
  ];

  return { socios, inc: incs, obras, ent, seq: 5 };
}

/* ---------- vistas: piezas comunes ---------- */
function brand() {
  return `<svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#fff"/><path d="M16 6 5 16h3v9h16v-9h3z" fill="#1f6f6b"/><path d="M16 22.5s-4-2.6-4-5.2a2.2 2.2 0 0 1 4-1.3 2.2 2.2 0 0 1 4 1.3c0 2.6-4 5.2-4 5.2z" fill="#fff"/></svg>`;
}
function fotos(i) {
  if (!i.fotoAntes && !i.fotoDespues) return '';
  return `<div class="ph">${i.fotoAntes ? `<figure><img src="${i.fotoAntes.url}" alt="Foto antes"><figcaption>Antes</figcaption></figure>` : ''}${i.fotoDespues ? `<figure><img src="${i.fotoDespues.url}" alt="Foto después"><figcaption>Después</figcaption></figure>` : ''}</div>`;
}
function matList(items) {
  if (!items || !items.length) return '';
  return `<ul class="mats">${items.map(m => `<li><span>${esc(m.n)}</span><b>${eur(m.c)}</b></li>`).join('')}</ul>`;
}
function firmaInfo(a) {
  if (!a) return '';
  return `<div class="sign">✔ Aceptado por <b>${esc(a.usuario)}</b> el ${fDT(a.fecha)} (${esc(a.metodo)}) · ${eur(a.importe)}<br>Huella del documento: <code>${a.huella.slice(0, 16)}…</code></div>`;
}
function cardInc(i, rol) {
  const [et, cl] = ESTADOS[i.estado];
  const s = socio(i.socio);
  let extra = '';
  if (i.estado === 'resuelto') {
    extra = `<p><b>Qué se hizo:</b> ${esc(i.trabajo)}</p>${matList(i.material)}
      <p class="meta">Material: <b>${eur(i.coste)}</b> · mano de obra y desplazamiento incluidos en la cuota${i.autorizada === 'limite' && i.coste > 0 ? ' · dentro del límite pre-autorizado' : ''}</p>
      ${firmaInfo(i.autorizada === 'aceptacion' ? i.aprobacion : null)}`;
  } else if (i.estado === 'aprobado') {
    extra = firmaInfo(i.aprobacion);
  }
  let acc = '';
  if (rol === 'tecnico') {
    if (i.estado === 'abierto') acc = `<button class="btn ghost" data-act="camino" data-id="${i.id}">Salgo hacia allí</button><button class="btn" data-act="resolver" data-id="${i.id}">Resolver</button>`;
    else if (i.estado === 'camino') acc = `<button class="btn" data-act="resolver" data-id="${i.id}">Resolver</button>`;
    else if (i.estado === 'aprobacion') acc = `<div class="meta">Esperando la aprobación de ${esc(s.hijo)}…</div>`;
    else if (i.estado === 'aprobado') acc = `<button class="btn amber" data-act="resolver" data-id="${i.id}">Completar y enviar parte</button>`;
  }
  if (i.estado === 'resuelto') acc = `<button class="btn ghost" data-act="pdf" data-id="${i.id}">Descargar parte (PDF)</button>`;
  return `<div class="card">
    <div class="row between"><b>${esc(i.tipo)}</b><span class="badge ${cl}">${et}</span></div>
    ${rol === 'tecnico' ? `<div class="meta"><b>${esc(s.nombre)}</b> · ${esc(s.pueblo)}</div>` : ''}
    <p>${esc(i.desc)}</p>
    <div class="meta">${i.id} · Aviso: ${fDT(i.creada)}${i.urgencia === 'urgente' ? ' · <b class="u">URGENTE</b>' : ''}${i.fuera ? ' · fuera de cuota' : ''}</div>
    ${i.camino && i.estado === 'camino' ? `<div class="meta">El técnico salió a las ${fTime(i.camino)}</div>` : ''}
    ${i.resuelta ? `<div class="meta">Resuelto: ${fDT(i.resuelta)} · atendido en ${fDur(i.resuelta - i.creada)}</div>` : ''}
    ${extra}${fotos(i)}
    ${acc ? `<div class="btns">${acc}</div>` : ''}
  </div>`;
}

/* ---------- vista FAMILIA ---------- */
function vFamilia() {
  const s = socio(UI.socio);
  const incs = S.inc.filter(i => i.socio === s.id).sort((a, b) => b.creada - a.creada);
  const pend = incs.filter(i => i.estado === 'aprobacion');
  const obras = S.obras.filter(o => o.socio === s.id);
  const usados = incs.filter(i => !i.fuera).length;
  const disp = Math.max(0, s.total - usados);
  const hasta = new Date(s.desde.getTime() + 365 * DAY);
  const resueltas = incs.filter(i => i.estado === 'resuelto');
  const gasto = resueltas.reduce((a, i) => a + i.coste, 0);
  const medio = resueltas.length ? fDur(resueltas.reduce((a, i) => a + (i.resuelta - i.creada), 0) / resueltas.length) : '—';
  const ent = S.ent.filter(e => e.socio === s.id);
  const prox = ent.find(e => e.estado === 'pendiente');
  const ult = ent.filter(e => e.estado === 'entregada').sort((a, b) => b.fecha - a.fecha)[0];
  const limOpts = [...new Set([...LIMITES, s.limite])].sort((a, b) => a - b);

  let h = `
  <div class="card">
    <div class="meta">Casa de</div>
    <h3>${esc(s.nombre)}</h3>
    <div class="meta">${esc(s.pueblo)} · Plan Familiar · socio desde ${fDate(s.desde)}</div>
    <label for="sel-socio">Ver como</label>
    <select id="sel-socio" data-chg="socio">${S.socios.map(x => `<option value="${x.id}" ${x.id === s.id ? 'selected' : ''}>${esc(x.hijo)} (hijo/a de ${esc(x.nombre.split(' ')[0])})</option>`).join('')}</select>
  </div>`;

  if (pend.length) {
    h += `<h2>Necesitamos tu decisión</h2>`;
    pend.forEach(i => {
      h += `<div class="card alert">
        <div class="row between"><b>Compra de material · ${esc(i.tipo)}</b><span class="badge b-amber">Aprobar</span></div>
        <p>${esc(i.desc)}</p>
        <p class="meta">El material supera tu límite pre-autorizado (${eur(s.limite)}). No compramos nada sin tu visto bueno.</p>
        ${matList(i.presupuesto.items)}
        <p><b>Total material: ${eur(i.presupuesto.total)}</b> <span class="meta">(mano de obra y desplazamiento incluidos)</span></p>
        <div class="btns"><button class="btn red" data-act="reject-inc" data-id="${i.id}">Rechazar</button><button class="btn" data-act="accept-inc" data-id="${i.id}">Aceptar con código</button></div>
      </div>`;
    });
  }

  if (obras.length) {
    h += `<h2>Presupuestos de obra</h2>`;
    obras.forEach(o => {
      h += `<div class="card ${o.estado === 'pendiente' ? 'alert' : ''}">
        <div class="row between"><b>${esc(o.titulo)}</b><span class="badge ${o.estado === 'aceptada' ? 'b-green' : o.estado === 'rechazada' ? 'b-blue' : 'b-amber'}">${o.estado === 'aceptada' ? 'Aceptado' : o.estado === 'rechazada' ? 'Rechazado' : 'Pendiente'}</span></div>
        <p>${esc(o.desc)}</p>
        <div class="meta">${o.id} · válido hasta ${fDate(o.validez)} · importes de ejemplo</div>
        ${o.opciones.map(op => `<div class="opt"><div class="row between"><b>Opción ${op.k}: ${esc(op.nombre)}</b><b>${eur(op.importe)}</b></div><div class="meta">${esc(op.detalle)}</div>
          ${o.estado === 'pendiente' ? `<button class="btn ${op.k === 'A' ? 'ghost' : ''} sm block" style="margin-top:8px" data-act="accept-obra" data-id="${o.id}" data-k="${op.k}">Aceptar opción ${op.k} con código</button>` : ''}
          ${o.estado === 'aceptada' && o.eleccion === op.k ? '<div class="sign">✔ Opción elegida</div>' : ''}</div>`).join('')}
        ${o.estado === 'pendiente' ? `<button class="btn red sm block" data-act="reject-obra" data-id="${o.id}">No me interesa</button>` : ''}
        ${firmaInfo(o.aceptacion)}
      </div>`;
    });
  }

  h += `<h2>Tus avisos</h2>
  <div class="card">
    <div class="row between"><div><div class="big">${disp}</div><div class="meta">avisos disponibles de ${s.total}</div></div>
    <div style="text-align:right" class="meta">Año de servicio<br>hasta ${fDate(hasta)}</div></div>
    <div class="meter"><i style="width:${Math.round(disp / s.total * 100)}%"></i></div>
    <div class="meta">Mano de obra y desplazamiento incluidos. Solo pagas el material.</div>
    <button class="btn block" style="margin-top:12px" data-act="new-aviso">＋ Nuevo aviso</button>
  </div>
  <div class="card">
    <label for="sel-lim" style="margin-top:0">Límite de gasto pre-autorizado</label>
    <select id="sel-lim" data-chg="limite">${limOpts.map(l => `<option value="${l}" ${l === s.limite ? 'selected' : ''}>${l === 0 ? 'Ninguno: consultar siempre' : 'Hasta ' + eur(l)}</option>`).join('')}</select>
    <div class="meta" style="margin-top:6px">Hasta ese importe de material, el técnico resuelve sin esperar. Por encima, te pide aprobación.</div>
  </div>`;

  h += `<h2>Entrega de la farmacia</h2><div class="card">`;
  if (!s.entrega) h += `<div class="empty">Servicio no contratado en este plan.</div>`;
  else {
    h += prox ? `<p>📦 Próxima entrega prevista: <b>${prox.prevista.toLocaleDateString('es-ES', { weekday: 'long' })} ${fDate(prox.prevista)}</b></p>` : '';
    h += ult ? `<p class="meta">Última entrega: ${fDT(ult.fecha)} · entregada en mano a ${esc(s.nombre.split(' ')[0])}</p>` : '';
    h += `<p class="meta">Farmacia (ejemplo) · ruta semanal</p>`;
  }
  h += `</div>`;

  h += `<h2>Historial de incidencias</h2>`;
  h += incs.length ? incs.filter(i => i.estado !== 'aprobacion').map(i => cardInc(i, 'familia')).join('') : `<div class="card empty">Aún no hay incidencias.</div>`;

  h += `<h2>Resumen del año</h2><div class="card"><div class="kv">
    <div><b>${usados}</b><span>avisos usados</span></div>
    <div><b>${resueltas.length}</b><span>resueltos</span></div>
    <div><b>${eur(gasto)}</b><span>material pagado</span></div>
    <div><b>${medio}</b><span>tiempo medio de atención</span></div></div></div>`;
  return h;
}

/* ---------- vista TÉCNICO ---------- */
function vTecnico() {
  const rank = i => (i.urgencia === 'urgente' ? 0 : 1);
  const abiertas = S.inc.filter(i => i.estado !== 'resuelto').sort((a, b) => rank(a) - rank(b) || a.creada - b.creada);
  const hechas = S.inc.filter(i => i.estado === 'resuelto').sort((a, b) => b.resuelta - a.resuelta).slice(0, 3);
  const ruta = S.ent.filter(e => e.estado === 'pendiente');
  let h = `<div class="card"><h3>Panel del técnico</h3>
    <div class="kv"><div><b>${abiertas.length}</b><span>avisos abiertos</span></div><div><b>${ruta.length}</b><span>entregas en la ruta</span></div></div></div>`;
  h += `<h2>Avisos pendientes</h2>`;
  h += abiertas.length ? abiertas.map(i => cardInc(i, 'tecnico')).join('') : `<div class="card empty">Todo al día ✔</div>`;
  h += `<h2>Ruta semanal · entregas de farmacia</h2>`;
  h += ruta.length ? ruta.map(e => {
    const s = socio(e.socio);
    return `<div class="card"><div class="row between"><div><b>${esc(s.nombre)}</b><div class="meta">${esc(s.pueblo)} · previsto ${e.prevista.toLocaleDateString('es-ES', { weekday: 'long' })} ${fTime(e.prevista)}</div></div>
      <button class="btn sm" style="flex:none" data-act="entregar" data-id="${e.id}">Entregada</button></div></div>`;
  }).join('') : `<div class="card empty">Ruta completada ✔</div>`;
  h += `<h2>Últimos partes enviados</h2>`;
  h += hechas.length ? hechas.map(i => cardInc(i, 'tecnico')).join('') : `<div class="card empty">Sin partes todavía.</div>`;
  return h;
}

/* ---------- render ---------- */
function render() {
  const y = window.scrollY;
  $('#app').innerHTML = `
  <header class="top"><div class="in">
    <div class="brand">${brand()}<span>MIRANDA<br>TE AYUDA</span></div>
    <div class="seg"><button class="${UI.view === 'familia' ? 'on' : ''}" data-act="view" data-v="familia">Familia</button><button class="${UI.view === 'tecnico' ? 'on' : ''}" data-act="view" data-v="tecnico">Técnico</button></div>
  </div></header>
  <div class="wrap">
    <div class="demo"><b>DEMO</b> · datos y nombres ficticios · no se guarda nada. Cambia entre <b>Familia</b> y <b>Técnico</b> para ver los dos lados.</div>
    ${UI.view === 'familia' ? vFamilia() : vTecnico()}
    <footer>Tranquilidad para ti, cuidado para tus padres<br><button data-act="reset">Reiniciar demo</button></footer>
  </div>`;
  window.scrollTo(0, y);
}

/* ---------- aviso nuevo (familia) ---------- */
function modalAviso() {
  const s = socio(UI.socio);
  const usados = S.inc.filter(i => i.socio === s.id && !i.fuera).length;
  TMP.foto = null;
  openModal(`<h3>Nuevo aviso</h3>
    <label for="f-tipo">Tipo</label><select id="f-tipo">${TIPOS.map(t => `<option>${t}</option>`).join('')}</select>
    <label for="f-desc">¿Qué ocurre?</label><textarea id="f-desc" rows="3" placeholder="Ej.: el enchufe del salón no da corriente"></textarea>
    <label>Urgencia</label>
    <div class="radios"><label><input type="radio" name="f-urg" value="normal" checked>Normal · respuesta en 72 h</label><label><input type="radio" name="f-urg" value="urgente">Urgente · respuesta en 24 h</label></div>
    <label for="f-foto">Foto (opcional)</label><input type="file" id="f-foto" accept="image/*"><div id="f-prev"></div>
    ${usados >= s.total ? '<div class="notice">Has usado todos los avisos incluidos. Puedes pedir la visita igualmente: se presupuesta aparte.</div>' : ''}
    <div class="row"><button class="btn ghost" data-act="close">Cancelar</button><button class="btn" data-act="save-aviso">Enviar aviso</button></div>`);
}
function saveAviso() {
  const s = socio(UI.socio);
  const desc = $('#f-desc').value.trim();
  if (desc.length < 5) { toast('Cuéntanos brevemente qué ocurre'); return; }
  const usados = S.inc.filter(i => i.socio === s.id && !i.fuera).length;
  S.seq++;
  S.inc.push({
    id: 'MTA-' + String(S.seq).padStart(4, '0'), socio: s.id, tipo: $('#f-tipo').value, desc,
    urgencia: document.querySelector('input[name=f-urg]:checked').value, creada: new Date(), estado: 'abierto',
    resuelta: null, camino: null, trabajo: '', material: [], coste: 0, fotoAntes: TMP.foto || null, fotoDespues: null,
    aprobacion: null, autorizada: null, presupuesto: null, fuera: usados >= s.total
  });
  TMP.foto = null;
  closeModal(); render(); toast('Aviso enviado al técnico');
}

/* ---------- aceptación con código ---------- */
function askCode({ titulo, detalle, importe, payload, onOk }) {
  const s = socio(UI.socio);
  const code = String(1000 + Math.floor(Math.random() * 9000));
  openModal(`<h3>${esc(titulo)}</h3>
    <div>${detalle}</div>
    <div class="notice">Hemos enviado un código al móvil <b>${esc(s.tel)}</b>.<br><small>Demo: el código es <b id="demo-code">${code}</b></small></div>
    <label for="f-code">Código de 4 cifras</label>
    <input id="f-code" inputmode="numeric" maxlength="4" autocomplete="one-time-code">
    <div id="f-err" class="err"></div>
    <div class="row"><button class="btn ghost" data-act="close">Cancelar</button><button class="btn" id="f-ok">Confirmar</button></div>`);
  $('#f-ok').onclick = async () => {
    if ($('#f-code').value.trim() !== code) { $('#f-err').textContent = 'Código incorrecto'; return; }
    const fecha = new Date();
    const hx = await huella(JSON.stringify(Object.assign({}, payload, { fecha: fecha.toISOString(), usuario: s.hijo })));
    closeModal();
    onOk({ fecha, usuario: s.hijo, importe, huella: hx, metodo: 'código por SMS' });
  };
}
function acceptInc(id) {
  const i = inc(id);
  askCode({
    titulo: `Autorizar ${eur(i.presupuesto.total)} de material`,
    detalle: `<p>${esc(i.desc)}</p>${matList(i.presupuesto.items)}`,
    importe: i.presupuesto.total,
    payload: { id: i.id, items: i.presupuesto.items, total: i.presupuesto.total },
    onOk: a => { i.aprobacion = a; i.estado = 'aprobado'; i.autorizada = 'aceptacion'; render(); toast('Gasto autorizado: el técnico continúa'); }
  });
}
function acceptObra(id, k) {
  const o = obra(id), op = o.opciones.find(x => x.k === k);
  askCode({
    titulo: `Aceptar opción ${k} · ${eur(op.importe)}`,
    detalle: `<p><b>${esc(o.titulo)}</b></p><p>${esc(op.nombre)}</p><p class="meta">${esc(op.detalle)}</p>`,
    importe: op.importe,
    payload: { id: o.id, opcion: k, importe: op.importe },
    onOk: a => { o.estado = 'aceptada'; o.eleccion = k; o.aceptacion = a; render(); toast('Presupuesto aceptado'); }
  });
}

/* ---------- resolver (técnico) ---------- */
const matRow = m => `<div class="mrow"><input class="mn" placeholder="Material" value="${esc(m.n)}"><input class="mc" inputmode="decimal" placeholder="€" value="${m.c === '' || m.c == null ? '' : esc(String(m.c).replace('.', ','))}"></div>`;
function readMats() {
  return [...document.querySelectorAll('#r-mats .mrow')].map(r => ({
    n: r.querySelector('.mn').value.trim(),
    c: parseFloat(r.querySelector('.mc').value.replace(',', '.')) || 0
  })).filter(m => m.n || m.c);
}
function updRes() {
  if (!TMP.res || !$('#r-msg')) return;
  const i = inc(TMP.res.id), s = socio(i.socio);
  const total = readMats().reduce((a, m) => a + m.c, 0);
  const approved = i.estado === 'aprobado';
  const cap = approved ? i.presupuesto.total : s.limite;
  const ok = total <= cap + 0.001;
  $('#r-msg').innerHTML = `Material: <b>${eur(total)}</b> · ${approved ? 'importe aprobado' : 'límite pre-autorizado'}: <b>${eur(cap)}</b><br>` +
    (ok ? '<span class="okc">✔ Dentro de lo autorizado: se cierra el aviso y se envía el parte.</span>'
        : '<span class="warnc">⚠ Supera lo autorizado: se enviará un presupuesto a la familia antes de comprar.</span>');
  $('#r-send').textContent = ok ? 'Resolver y enviar parte' : 'Enviar presupuesto a la familia';
}
function modalResolver(id) {
  const i = inc(id);
  const approved = i.estado === 'aprobado';
  TMP.res = { id, foto: null };
  const rows = approved ? i.presupuesto.items : [{ n: '', c: '' }];
  openModal(`<h3>${approved ? 'Completar reparación' : 'Resolver aviso'}</h3>
    <div class="meta">${esc(i.tipo)} · ${esc(i.desc)}</div>
    <label for="r-trabajo">Qué se ha hecho</label><textarea id="r-trabajo" rows="3">${esc(i.trabajo || '')}</textarea>
    <label>Material cambiado (opcional)</label>
    <div id="r-mats">${rows.map(matRow).join('')}</div>
    <button class="btn ghost sm" data-act="add-mat">＋ Añadir material</button>
    <div class="notice" id="r-msg"></div>
    <label for="r-foto">Foto del resultado</label><input type="file" id="r-foto" accept="image/*"><div id="r-prev"></div>
    <div class="row"><button class="btn ghost" data-act="close">Cancelar</button><button class="btn" id="r-send" data-act="submit-res">Enviar</button></div>`);
  updRes();
}
function submitRes() {
  const i = inc(TMP.res.id), s = socio(i.socio);
  const trabajo = $('#r-trabajo').value.trim();
  if (trabajo.length < 3) { toast('Describe el trabajo realizado'); return; }
  const items = readMats();
  const total = items.reduce((a, m) => a + m.c, 0);
  const approved = i.estado === 'aprobado';
  const cap = approved ? i.presupuesto.total : s.limite;
  i.trabajo = trabajo;
  if (total > cap + 0.001) {
    i.presupuesto = { items, total, enviado: new Date() };
    i.estado = 'aprobacion'; i.aprobacion = null; i.autorizada = null;
    closeModal(); render(); toast(`Presupuesto de ${eur(total)} enviado a ${s.hijo}`);
    return;
  }
  i.material = items; i.coste = total;
  i.fotoDespues = TMP.res.foto || placeholder('Foto después', 150);
  i.resuelta = new Date(); i.estado = 'resuelto';
  i.autorizada = approved ? 'aceptacion' : (total > 0 ? 'limite' : null);
  closeModal(); render(); toast('Parte enviado a la familia');
}

/* ---------- PDF del parte (sin librerías) ---------- */
const WIN = { 0x20AC: 0x80, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2026: 0x85 };
function latin1(s) {
  const u = new Uint8Array(s.length);
  for (let k = 0; k < s.length; k++) { let c = s.charCodeAt(k); if (WIN[c]) c = WIN[c]; else if (c > 255) c = 63; u[k] = c; }
  return u;
}
const pdfEsc = s => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
function wrapTxt(s, max) {
  const out = [];
  for (const para of String(s).split('\n')) {
    let line = '';
    for (const w of para.split(/\s+/)) {
      if (!w) continue;
      if ((line + ' ' + w).trim().length > max) { if (line) out.push(line); line = w; } else line = (line + ' ' + w).trim();
    }
    out.push(line);
  }
  return out;
}
function dataUrlBytes(url) {
  const b = atob(url.split(',')[1]); const u = new Uint8Array(b.length);
  for (let k = 0; k < b.length; k++) u[k] = b.charCodeAt(k);
  return u;
}
class PdfDoc {
  constructor() { this.pages = []; this.newPage(); }
  newPage() { this.cur = { ops: [], imgs: [] }; this.pages.push(this.cur); this.y = 792; }
  need(h) { if (this.y - h < 60) this.newPage(); }
  text(s, o = {}) {
    const size = o.size || 11, x = o.x || 50, gap = o.gap == null ? 4 : o.gap, col = o.color || [0, 0, 0];
    const max = Math.floor((545 - x) / (size * 0.52));
    for (const line of wrapTxt(s, max)) {
      this.need(size + gap);
      this.y -= size;
      this.cur.ops.push(`${col.join(' ')} rg BT /F${o.bold ? 2 : 1} ${size} Tf ${x} ${this.y.toFixed(1)} Td (${pdfEsc(line)}) Tj ET`);
      this.y -= gap;
    }
  }
  hr() { this.need(14); this.y -= 6; this.cur.ops.push(`0.8 G 0.6 w 50 ${this.y.toFixed(1)} m 545 ${this.y.toFixed(1)} l S`); this.y -= 8; }
  space(h) { this.y -= h; }
  photosRow(list) { // [{label, photo}]
    const ph = list.filter(p => p.photo);
    if (!ph.length) return;
    const maxW = 235, maxH = 175;
    const dims = ph.map(p => { const k = Math.min(maxW / p.photo.w, maxH / p.photo.h); return { w: p.photo.w * k, h: p.photo.h * k }; });
    const rowH = Math.max(...dims.map(d => d.h));
    this.need(rowH + 24);
    const top = this.y;
    ph.forEach((p, k) => {
      const x = 50 + k * 255;
      this.cur.ops.push(`0 g BT /F2 9 Tf ${x} ${(top - 9).toFixed(1)} Td (${pdfEsc(p.label)}) Tj ET`);
      const name = 'Im' + this.cur.imgs.length;
      this.cur.imgs.push({ name, bytes: dataUrlBytes(p.photo.url), w: p.photo.w, h: p.photo.h });
      this.cur.ops.push(`q ${dims[k].w.toFixed(1)} 0 0 ${dims[k].h.toFixed(1)} ${x} ${(top - 14 - dims[k].h).toFixed(1)} cm /${name} Do Q`);
    });
    this.y = top - rowH - 24;
  }
  bytes() {
    const parts = []; let len = 0; const offs = [];
    const put = x => { const b = typeof x === 'string' ? latin1(x) : x; parts.push(b); len += b.length; };
    let id = 5;
    const plan = this.pages.map(p => ({ page: id++, cont: id++, imgs: p.imgs.map(() => id++) }));
    const total = id - 1;
    put('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    const obj = (n, body) => { offs[n] = len; put(`${n} 0 obj\n${body}\nendobj\n`); };
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, `<< /Type /Pages /Kids [${plan.map(p => p.page + ' 0 R').join(' ')}] /Count ${this.pages.length} >>`);
    obj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    obj(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    this.pages.forEach((p, k) => {
      const pl = plan[k];
      const xo = p.imgs.map((im, j) => `/${im.name} ${pl.imgs[j]} 0 R`).join(' ');
      obj(pl.page, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << ${xo} >> >> /Contents ${pl.cont} 0 R >>`);
      const cs = latin1(p.ops.join('\n'));
      offs[pl.cont] = len; put(`${pl.cont} 0 obj\n<< /Length ${cs.length} >>\nstream\n`); put(cs); put('\nendstream\nendobj\n');
      p.imgs.forEach((im, j) => {
        const n = pl.imgs[j]; offs[n] = len;
        put(`${n} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length} >>\nstream\n`);
        put(im.bytes); put('\nendstream\nendobj\n');
      });
    });
    const xr = len;
    let x = `xref\n0 ${total + 1}\n0000000000 65535 f \n`;
    for (let n = 1; n <= total; n++) x += String(offs[n]).padStart(10, '0') + ' 00000 n \n';
    x += `trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF\n`;
    put(x);
    const out = new Uint8Array(len); let o = 0;
    for (const b of parts) { out.set(b, o); o += b.length; }
    return out;
  }
}
function descargarParte(id) {
  const i = inc(id), s = socio(i.socio);
  const D = new PdfDoc(), teal = [0.12, 0.44, 0.42], gris = [0.4, 0.4, 0.4];
  D.text('MIRANDA TE AYUDA', { size: 20, bold: true, color: teal, gap: 2 });
  D.text('Parte de intervención', { size: 13, gap: 2 });
  D.text('DEMO · documento de ejemplo con datos ficticios', { size: 9, color: gris });
  D.hr();
  D.text(`Nº de parte: ${i.id}`, { bold: true });
  D.text(`Socio: ${s.nombre} · ${s.pueblo}`);
  D.text(`Avisado por: ${s.hijo}`);
  D.text(`Fecha del aviso: ${fDT(i.creada)}${i.urgencia === 'urgente' ? ' (urgente)' : ''}`);
  D.text(`Fecha de resolución: ${fDT(i.resuelta)}`);
  D.text(`Tiempo de atención: ${fDur(i.resuelta - i.creada)}`);
  D.hr();
  D.text(`Incidencia (${i.tipo})`, { bold: true });
  D.text(i.desc);
  D.space(4);
  D.text('Trabajo realizado', { bold: true });
  D.text(i.trabajo);
  D.space(4);
  D.text('Material', { bold: true });
  if (i.material.length) i.material.forEach(m => D.text(`• ${m.n}: ${eur(m.c)}`, { x: 58 }));
  else D.text('Sin material.');
  D.text(`Total material: ${eur(i.coste)}`, { bold: true });
  D.text('Mano de obra y desplazamiento: incluidos en la cuota.', { color: gris });
  D.space(4);
  D.text('Autorización del gasto', { bold: true });
  if (i.autorizada === 'aceptacion' && i.aprobacion) {
    D.text(`Presupuesto aceptado por ${i.aprobacion.usuario} el ${fDT(i.aprobacion.fecha)} (${i.aprobacion.metodo}), importe ${eur(i.aprobacion.importe)}.`);
    D.text(`Huella del documento (SHA-256): ${i.aprobacion.huella}`, { size: 8, color: gris });
  } else if (i.autorizada === 'limite') D.text(`Gasto dentro del límite pre-autorizado por la familia (${eur(s.limite)}).`);
  else D.text('Sin gasto de material.');
  D.space(6);
  D.photosRow([{ label: 'Antes', photo: i.fotoAntes }, { label: 'Después', photo: i.fotoDespues }]);
  D.text('Tranquilidad para ti, cuidado para tus padres', { size: 9, color: gris });
  const blob = new Blob([D.bytes()], { type: 'application/pdf' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `parte-${i.id}.pdf`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('Parte descargado');
}

/* ---------- acciones ---------- */
const ACT = {
  view: d => { UI.view = d.v; render(); window.scrollTo(0, 0); },
  close: () => closeModal(),
  'new-aviso': modalAviso,
  'save-aviso': saveAviso,
  'add-mat': () => { $('#r-mats').insertAdjacentHTML('beforeend', matRow({ n: '', c: '' })); },
  camino: d => { const i = inc(d.id); i.estado = 'camino'; i.camino = new Date(); render(); toast('La familia ve que vas de camino'); },
  resolver: d => modalResolver(d.id),
  'submit-res': submitRes,
  'accept-inc': d => acceptInc(d.id),
  'reject-inc': d => { const i = inc(d.id); i.estado = 'abierto'; i.presupuesto = null; render(); toast('Presupuesto rechazado: el técnico te llamará'); },
  'accept-obra': d => acceptObra(d.id, d.k),
  'reject-obra': d => { obra(d.id).estado = 'rechazada'; render(); toast('Presupuesto descartado'); },
  pdf: d => descargarParte(d.id),
  entregar: d => { const e = S.ent.find(x => x.id === d.id); e.estado = 'entregada'; e.fecha = new Date(); render(); toast('Entrega registrada: la familia lo ve'); },
  reset: () => { S = seed(); render(); toast('Demo reiniciada'); }
};
document.addEventListener('click', e => {
  if (e.target.id === 'modal') { closeModal(); return; }
  const t = e.target.closest('[data-act]');
  if (t && ACT[t.dataset.act]) { e.preventDefault(); ACT[t.dataset.act](t.dataset, t); }
});
document.addEventListener('change', async e => {
  const t = e.target;
  if (t.dataset && t.dataset.chg === 'socio') { UI.socio = t.value; render(); }
  else if (t.dataset && t.dataset.chg === 'limite') { socio(UI.socio).limite = Number(t.value); render(); toast('Límite actualizado'); }
  else if (t.id === 'f-foto' || t.id === 'r-foto') {
    const dest = t.id === 'f-foto' ? 'f' : 'r', prev = $(dest === 'f' ? '#f-prev' : '#r-prev');
    let ph = null;
    if (t.files && t.files[0]) {
      try { ph = await fileToPhoto(t.files[0]); } catch (err) { toast('No se pudo leer la imagen'); }
    }
    if (dest === 'f') TMP.foto = ph; else if (TMP.res) TMP.res.foto = ph;
    prev.innerHTML = ph ? `<img class="prev" src="${ph.url}" alt="">` : '';
  }
});
document.addEventListener('input', e => { if (e.target.closest && e.target.closest('#r-mats')) updRes(); });

/* ---------- arranque ---------- */
S = seed();
render();
if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
