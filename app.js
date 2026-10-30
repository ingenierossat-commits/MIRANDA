/* ============================================================
   MIRANDA TE AYUDA · demo interactiva · app.js v1.2
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
const UI = { view: 'familia', socio: 's1', tabF: 'inicio', tabT: 'avisos' };
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

/* logo (JPEG en base64) para la cabecera del PDF */
const LOGO = { url: 'data:image/jpeg;base64,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', w: 260, h: 220 };

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
  return `<img src="ICONS/logo-mark.png" alt="MIRANDA te ayuda"><span class="bt"><b>MIRANDA</b><i>te ayuda</i></span>`;
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

/* ---------- vistas por pestañas ---------- */
const TABS_F = [['inicio', 'Inicio', '🏠'], ['incid', 'Incidencias', '🛠️'], ['obras', 'Obras', '🏗️'], ['farm', 'Farmacia', '💊'], ['ajustes', 'Ajustes', '⚙️']];
const TABS_T = [['avisos', 'Avisos', '🔔'], ['ruta', 'Ruta', '🚐'], ['partes', 'Partes', '📄']];

function famData() {
  const s = socio(UI.socio);
  const incs = S.inc.filter(i => i.socio === s.id).sort((a, b) => b.creada - a.creada);
  const usados = incs.filter(i => !i.fuera).length;
  return {
    s, incs, usados,
    resueltas: incs.filter(i => i.estado === 'resuelto'),
    pend: incs.filter(i => i.estado === 'aprobacion'),
    obras: S.obras.filter(o => o.socio === s.id),
    obrasPend: S.obras.filter(o => o.socio === s.id && o.estado === 'pendiente'),
    disp: Math.max(0, s.total - usados),
    hasta: new Date(s.desde.getTime() + 365 * DAY)
  };
}

function cardDecision(i, s) {
  return `<div class="card alert">
    <div class="row between"><b>Compra de material · ${esc(i.tipo)}</b><span class="badge b-amber">Aprobar</span></div>
    <p>${esc(i.desc)}</p>
    <p class="meta">El material supera tu límite pre-autorizado (${eur(s.limite)}). No compramos nada sin tu visto bueno.</p>
    ${matList(i.presupuesto.items)}
    <p><b>Total material: ${eur(i.presupuesto.total)}</b> <span class="meta">(mano de obra y desplazamiento incluidos)</span></p>
    <div class="btns"><button class="btn red" data-act="reject-inc" data-id="${i.id}">Rechazar</button><button class="btn" data-act="accept-inc" data-id="${i.id}">Aceptar con código</button></div>
  </div>`;
}

function cardObra(o) {
  const est = o.estado === 'aceptada' ? ['Aceptado', 'b-green'] : o.estado === 'rechazada' ? ['Descartado', 'b-blue'] : ['Pendiente', 'b-amber'];
  return `<div class="card ${o.estado === 'pendiente' ? 'alert' : ''}">
    <div class="row between"><b>${esc(o.titulo)}</b><span class="badge ${est[1]}">${est[0]}</span></div>
    <p>${esc(o.desc)}</p>
    <div class="meta">${o.id} · válido hasta ${fDate(o.validez)} · importes de ejemplo</div>
    ${o.opciones.map(op => `<div class="opt"><div class="row between"><b>Opción ${op.k}: ${esc(op.nombre)}</b><b>${eur(op.importe)}</b></div><div class="meta">${esc(op.detalle)}</div>
      ${o.estado === 'pendiente' ? `<button class="btn ${op.k === 'A' ? 'ghost' : ''} sm block" style="margin-top:8px" data-act="accept-obra" data-id="${o.id}" data-k="${op.k}">Aceptar opción ${op.k} con código</button>` : ''}
      ${o.estado === 'aceptada' && o.eleccion === op.k ? '<div class="sign">✔ Opción elegida</div>' : ''}</div>`).join('')}
    ${o.estado === 'pendiente' ? `<button class="btn red sm block" data-act="reject-obra" data-id="${o.id}">No me interesa</button>` : ''}
    ${firmaInfo(o.aceptacion)}
  </div>`;
}

function tInicio(d) {
  const { s } = d;
  let h = `<div class="card"><div class="meta">Casa de</div><h3 style="margin:0">${esc(s.nombre)}</h3><div class="meta">${esc(s.pueblo)} · Plan Familiar · socio desde ${fDate(s.desde)}</div></div>`;
  if (d.pend.length) h += `<h2>Necesitamos tu decisión</h2>` + d.pend.map(i => cardDecision(i, s)).join('');
  if (d.obrasPend.length) {
    const n = d.obrasPend.length;
    h += `<div class="card alert"><b>Tienes ${n} presupuesto${n > 1 ? 's' : ''} de obra pendiente${n > 1 ? 's' : ''}</b><p class="meta">Revísalo con calma: válido hasta ${fDate(d.obrasPend[0].validez)}.</p><button class="btn ghost sm block" data-act="tab" data-t="obras">Ver presupuesto</button></div>`;
  }
  h += `<h2>Tus avisos</h2>
  <div class="card">
    <div class="row between"><div><div class="big">${d.disp}</div><div class="meta">avisos disponibles de ${s.total}</div></div>
    <div style="text-align:right" class="meta">Año de servicio<br>hasta ${fDate(d.hasta)}</div></div>
    <div class="meter"><i style="width:${Math.round(d.disp / s.total * 100)}%"></i></div>
    <div class="meta">Mano de obra y desplazamiento incluidos. Solo pagas el material.</div>
    <button class="btn block" style="margin-top:12px" data-act="new-aviso">＋ Nuevo aviso</button>
  </div>`;
  const curso = d.incs.filter(i => i.estado !== 'resuelto' && i.estado !== 'aprobacion');
  if (curso.length) h += `<h2>En curso</h2>` + curso.map(i => cardInc(i, 'familia')).join('');
  return h;
}

function tIncid(d) {
  const curso = d.incs.filter(i => i.estado !== 'resuelto');
  let h = `<h2>En curso</h2>` + (curso.length ? curso.map(i => cardInc(i, 'familia')).join('') : `<div class="card empty">Nada pendiente ✔</div>`);
  h += `<h2>Resueltas</h2>` + (d.resueltas.length ? d.resueltas.map(i => cardInc(i, 'familia')).join('') : `<div class="card empty">Aún no hay incidencias resueltas.</div>`);
  return h;
}

function tObras(d) {
  return `<h2>Presupuestos de obra</h2>` + (d.obras.length ? d.obras.map(cardObra).join('') : `<div class="card empty">No hay presupuestos de obra.</div>`);
}

function tFarm(d) {
  const { s } = d;
  const ent = S.ent.filter(e => e.socio === s.id);
  const prox = ent.find(e => e.estado === 'pendiente');
  const ult = ent.filter(e => e.estado === 'entregada').sort((a, b) => b.fecha - a.fecha)[0];
  let h = `<h2>Entrega de la farmacia</h2><div class="card">`;
  if (!s.entrega) h += `<div class="empty">Servicio no contratado en este plan.</div>`;
  else {
    h += prox ? `<p>📦 Próxima entrega prevista: <b>${prox.prevista.toLocaleDateString('es-ES', { weekday: 'long' })} ${fDate(prox.prevista)}</b></p>` : '<p>No hay entregas previstas.</p>';
    h += ult ? `<p class="meta">Última entrega: ${fDT(ult.fecha)} · entregada en mano a ${esc(s.nombre.split(' ')[0])}</p>` : '';
    h += `<p class="meta">Farmacia (ejemplo) · ruta semanal</p>`;
  }
  return h + `</div>`;
}

function tAjustes(d) {
  const { s } = d;
  const medio = d.resueltas.length ? fDur(d.resueltas.reduce((a, i) => a + (i.resuelta - i.creada), 0) / d.resueltas.length) : '—';
  const gasto = d.resueltas.reduce((a, i) => a + i.coste, 0);
  const limOpts = [...new Set([...LIMITES, s.limite])].sort((a, b) => a - b);
  return `<h2>Límite de gasto</h2><div class="card">
    <label for="sel-lim" style="margin-top:0">Límite de gasto pre-autorizado</label>
    <select id="sel-lim" data-chg="limite">${limOpts.map(l => `<option value="${l}" ${l === s.limite ? 'selected' : ''}>${l === 0 ? 'Ninguno: consultar siempre' : 'Hasta ' + eur(l)}</option>`).join('')}</select>
    <div class="meta" style="margin-top:6px">Hasta ese importe de material, el técnico resuelve sin esperar. Por encima, te pide aprobación.</div></div>
  <h2>Resumen del año</h2><div class="card"><div class="kv">
    <div><b>${d.usados}</b><span>avisos usados</span></div>
    <div><b>${d.resueltas.length}</b><span>resueltos</span></div>
    <div><b>${eur(gasto)}</b><span>material pagado</span></div>
    <div><b>${medio}</b><span>tiempo medio de atención</span></div></div></div>
  <h2>Solo en la demo</h2><div class="card">
    <label for="sel-socio" style="margin-top:0">Ver como</label>
    <select id="sel-socio" data-chg="socio">${S.socios.map(x => `<option value="${x.id}" ${x.id === s.id ? 'selected' : ''}>${esc(x.hijo)} (hijo/a de ${esc(x.nombre.split(' ')[0])})</option>`).join('')}</select></div>`;
}

function tAvisos() {
  const rank = i => (i.urgencia === 'urgente' ? 0 : 1);
  const abiertas = S.inc.filter(i => i.estado !== 'resuelto').sort((a, b) => rank(a) - rank(b) || a.creada - b.creada);
  const ruta = S.ent.filter(e => e.estado === 'pendiente');
  return `<div class="card"><h3>Panel del técnico</h3>
    <div class="kv"><div><b>${abiertas.length}</b><span>avisos abiertos</span></div><div><b>${ruta.length}</b><span>entregas en la ruta</span></div></div></div>
    <h2>Avisos pendientes</h2>` + (abiertas.length ? abiertas.map(i => cardInc(i, 'tecnico')).join('') : `<div class="card empty">Todo al día ✔</div>`);
}
function tRuta() {
  const ruta = S.ent.filter(e => e.estado === 'pendiente');
  return `<h2>Ruta semanal · entregas de farmacia</h2>` + (ruta.length ? ruta.map(e => {
    const s = socio(e.socio);
    return `<div class="card"><div class="row between"><div><b>${esc(s.nombre)}</b><div class="meta">${esc(s.pueblo)} · previsto ${e.prevista.toLocaleDateString('es-ES', { weekday: 'long' })} ${fTime(e.prevista)}</div></div>
      <button class="btn sm" style="flex:none" data-act="entregar" data-id="${e.id}">Entregada</button></div></div>`;
  }).join('') : `<div class="card empty">Ruta completada ✔</div>`);
}
function tPartes() {
  const hechas = S.inc.filter(i => i.estado === 'resuelto').sort((a, b) => b.resuelta - a.resuelta);
  return `<h2>Partes enviados</h2>` + (hechas.length ? hechas.map(i => cardInc(i, 'tecnico')).join('') : `<div class="card empty">Sin partes todavía.</div>`);
}

/* ---------- render ---------- */
function render() {
  const y = window.scrollY;
  const fam = UI.view === 'familia';
  const tabs = fam ? TABS_F : TABS_T;
  const cur = fam ? UI.tabF : UI.tabT;
  let body, badges = {};
  if (fam) {
    const d = famData();
    badges = { inicio: d.pend.length, incid: d.incs.filter(i => i.estado !== 'resuelto').length, obras: d.obrasPend.length };
    body = { inicio: tInicio, incid: tIncid, obras: tObras, farm: tFarm, ajustes: tAjustes }[cur](d);
  } else {
    badges = { avisos: S.inc.filter(i => i.estado !== 'resuelto').length, ruta: S.ent.filter(e => e.estado === 'pendiente').length };
    body = { avisos: tAvisos, ruta: tRuta, partes: tPartes }[cur]();
  }
  const first = cur === tabs[0][0];
  $('#app').innerHTML = `
  <header class="top"><div class="in">
    <div class="brand">${brand()}</div>
    <div class="seg"><button class="${fam ? 'on' : ''}" data-act="view" data-v="familia">Familia</button><button class="${!fam ? 'on' : ''}" data-act="view" data-v="tecnico">Técnico</button></div>
  </div></header>
  <div class="wrap">
    ${first ? `<div class="demo"><b>DEMO</b> · datos y nombres ficticios · no se guarda nada. Cambia entre <b>Familia</b> y <b>Técnico</b> para ver los dos lados.</div>` : ''}
    ${body}
    <footer>Tranquilidad para ti, cuidado para tus padres<br><button data-act="reset">Reiniciar demo</button></footer>
  </div>
  <nav class="tabs"><div class="in">${tabs.map(t => `<button class="${t[0] === cur ? 'on' : ''}" data-act="tab" data-t="${t[0]}"><span class="ic">${t[2]}</span>${t[1]}${badges[t[0]] ? `<span class="bdg">${badges[t[0]]}</span>` : ''}</button>`).join('')}</div></nav>`;
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
  logo(p, x, wPt) {
    const h = wPt * p.h / p.w, name = 'Im' + this.cur.imgs.length;
    this.cur.imgs.push({ name, bytes: dataUrlBytes(p.url), w: p.w, h: p.h });
    this.cur.ops.push(`q ${wPt.toFixed(1)} 0 0 ${h.toFixed(1)} ${x} ${(this.y - h).toFixed(1)} cm /${name} Do Q`);
    return h;
  }
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
  const D = new PdfDoc(), navy = [0.2, 0.25, 0.31], gris = [0.4, 0.4, 0.4];
  const top = D.y, lh = D.logo(LOGO, 50, 62);
  D.text('MIRANDA te ayuda', { size: 20, bold: true, color: navy, gap: 2, x: 122 });
  D.text('Parte de intervención', { size: 13, gap: 2, x: 122 });
  D.text('DEMO · documento de ejemplo con datos ficticios', { size: 9, color: gris, x: 122 });
  D.y = Math.min(D.y, top - lh - 4);
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
  tab: d => { if (UI.view === 'familia') UI.tabF = d.t; else UI.tabT = d.t; render(); window.scrollTo(0, 0); },
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
