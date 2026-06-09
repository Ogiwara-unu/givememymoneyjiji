// ════════════════════════════════════════════
//  MODELOS DE DATOS
// ════════════════════════════════════════════

/** Representa una canción con sus atributos básicos. */
class Song {
  constructor(id, nombre, artista, genero, duracion) {
    this.id       = parseInt(id);
    this.nombre   = nombre;
    this.artista  = artista;
    this.genero   = genero;
    this.duracion = duracion;
  }
}

/** Nodo del BST: almacena una canción y referencias a hijos izquierdo/derecho. */
class BSTNode {
  constructor(song) {
    this.song  = song;
    this.left  = null;
    this.right = null;
  }
}

// ════════════════════════════════════════════
//  ÁRBOL BINARIO DE BÚSQUEDA (BST)
//  Ordenado por Song.id (entero positivo).
//  Métodos públicos: insert, search, delete,
//  inOrder, preOrder, postOrder, height, size.
// ════════════════════════════════════════════
class BST {
  constructor() { this.root = null; }

  // --- Inserción ---

  /** Inserta una canción. Retorna false si el ID ya existe. */
  insert(song) {
    const node = new BSTNode(song);
    if (!this.root) { this.root = node; return true; }
    return this._insert(this.root, node);
  }

  /** Recursivo: navega izq/der según ID hasta encontrar hueco libre. */
  _insert(current, node) {
    if (node.song.id === current.song.id) return false; // ID duplicado
    if (node.song.id < current.song.id) {
      if (!current.left)  { current.left  = node; return true; }
      return this._insert(current.left, node);
    } else {
      if (!current.right) { current.right = node; return true; }
      return this._insert(current.right, node);
    }
  }

  // --- Búsqueda ---

  /** Retorna el Song con ese ID, o null si no existe. O(log n) promedio. */
  search(id) {
    return this._search(this.root, parseInt(id));
  }

  _search(node, id) {
    if (!node) return null;
    if (id === node.song.id) return node.song;
    return id < node.song.id ? this._search(node.left, id) : this._search(node.right, id);
  }

  // --- Eliminación ---

  /** Elimina el nodo con ese ID. Retorna true si se eliminó. */
  delete(id) {
    const [newRoot, deleted] = this._delete(this.root, parseInt(id));
    this.root = newRoot;
    return deleted;
  }

  /**
   * Casos:
   *  - Sin hijos: se elimina directamente.
   *  - Un hijo: se reemplaza con ese hijo.
   *  - Dos hijos: se sustituye con el sucesor inorden
   *    (mínimo del subárbol derecho) y se elimina ese sucesor.
   */
  _delete(node, id) {
    if (!node) return [null, false];
    if (id < node.song.id) {
      const [left, del] = this._delete(node.left, id);
      node.left = left;
      return [node, del];
    } else if (id > node.song.id) {
      const [right, del] = this._delete(node.right, id);
      node.right = right;
      return [node, del];
    } else {
      if (!node.left)  return [node.right, true];
      if (!node.right) return [node.left,  true];
      // Dos hijos: buscar sucesor inorden (mínimo del subárbol derecho)
      let min = node.right;
      while (min.left) min = min.left;
      node.song = min.song;
      const [right, del] = this._delete(node.right, min.song.id);
      node.right = right;
      return [node, del];
    }
  }

  // --- Recorridos ---

  /** InOrden (izq → raíz → der): produce canciones ordenadas por ID. */
  inOrder()   { const r = []; this._inOrder(this.root, r);   return r; }

  /** PreOrden (raíz → izq → der): útil para clonar/serializar el árbol. */
  preOrder()  { const r = []; this._preOrder(this.root, r);  return r; }

  /** PostOrden (izq → der → raíz): útil para liberar memoria o evaluar. */
  postOrder() { const r = []; this._postOrder(this.root, r); return r; }

  _inOrder(node, r)   { if (!node) return; this._inOrder(node.left, r);   r.push(node.song); this._inOrder(node.right, r); }
  _preOrder(node, r)  { if (!node) return; r.push(node.song); this._preOrder(node.left, r);  this._preOrder(node.right, r); }
  _postOrder(node, r) { if (!node) return; this._postOrder(node.left, r); this._postOrder(node.right, r); r.push(node.song); }

  // --- Métricas ---

  /** Altura: número de niveles del árbol. Árbol vacío = 0. */
  height() { return this._height(this.root); }
  _height(node) {
    if (!node) return 0;
    return 1 + Math.max(this._height(node.left), this._height(node.right));
  }

  /** Cardinalidad: total de nodos (canciones). */
  size() { return this.inOrder().length; }

  toArray() { return this.inOrder(); }
}

// ════════════════════════════════════════════
//  OPERACIONES DE CONJUNTOS
//  Usan los IDs como clave de identidad.
// ════════════════════════════════════════════

/** Unión (A ∪ B): todas las canciones de ambos árboles sin repetir. */
function union(bst1, bst2) {
  const map = new Map();
  bst1.inOrder().forEach(s => map.set(s.id, s));
  bst2.inOrder().forEach(s => { if (!map.has(s.id)) map.set(s.id, s); });
  return [...map.values()].sort((a, b) => a.id - b.id);
}

/** Intersección (A ∩ B): canciones que existen en ambos árboles. */
function intersection(bst1, bst2) {
  const set2 = new Set(bst2.inOrder().map(s => s.id));
  return bst1.inOrder().filter(s => set2.has(s.id));
}

/** Diferencia (A − B): canciones que están en bst1 pero NO en bst2. */
function difference(bst1, bst2) {
  const set2 = new Set(bst2.inOrder().map(s => s.id));
  return bst1.inOrder().filter(s => !set2.has(s.id));
}

// ════════════════════════════════════════════
//  RENDERIZADO SVG DEL ÁRBOL
//  Genera un SVG dinámico para visualizar
//  el BST en pantalla con nodos y aristas.
// ════════════════════════════════════════════
function renderTreeSVG(root, color) {
  if (!root) return null;

  const nodeRadius = 22;
  const levelH     = 70; // px entre niveles verticales

  /**
   * Asigna coordenada X a cada nodo usando un recorrido inorden.
   * Cada nodo ocupa al menos nodeRadius*2 px de ancho.
   * Retorna la posición X más a la derecha usada.
   */
  function assignX(node, depth, left) {
    if (!node) return left;
    node._depth = depth;
    const afterLeft = assignX(node.left, depth + 1, left);
    node._x = afterLeft + nodeRadius * 2;
    return assignX(node.right, depth + 1, node._x + nodeRadius * 2);
  }

  function collectNodes(node, arr) {
    if (!node) return;
    arr.push(node);
    collectNodes(node.left, arr);
    collectNodes(node.right, arr);
  }

  assignX(root, 0, nodeRadius);
  const allNodes = [];
  collectNodes(root, allNodes);

  const maxX   = Math.max(...allNodes.map(n => n._x)) + nodeRadius * 1.5;
  const maxDepth = Math.max(...allNodes.map(n => n._depth));
  const svgH   = (maxDepth + 1) * levelH + nodeRadius * 2;
  const svgW   = Math.max(maxX, 200);

  let lines = '';
  let nodes = '';

  // Dibujar aristas primero (quedan detrás de los nodos)
  allNodes.forEach(node => {
    const x = node._x;
    const y = node._depth * levelH + nodeRadius + 10;

    if (node.left) {
      const cx = node.left._x;
      const cy = node.left._depth * levelH + nodeRadius + 10;
      lines += `<line x1="${x}" y1="${y}" x2="${cx}" y2="${cy}" stroke="#444" stroke-width="1.5"/>`;
    }
    if (node.right) {
      const cx = node.right._x;
      const cy = node.right._depth * levelH + nodeRadius + 10;
      lines += `<line x1="${x}" y1="${y}" x2="${cx}" y2="${cy}" stroke="#444" stroke-width="1.5"/>`;
    }

    // Nodo: círculo + ID + primera palabra del nombre
    nodes += `
      <g class="tree-node" data-id="${node.song.id}">
        <circle cx="${x}" cy="${y}" r="${nodeRadius}" fill="${color}22" stroke="${color}" stroke-width="2"/>
        <text x="${x}" y="${y - 4}" text-anchor="middle" fill="${color}" font-size="11" font-weight="700" font-family="DM Sans,sans-serif">${node.song.id}</text>
        <text x="${x}" y="${y + 9}" text-anchor="middle" fill="#ccc" font-size="8" font-family="Inter,sans-serif">${node.song.nombre.split(' ')[0]}</text>
      </g>`;
  });

  return `<svg viewBox="0 0 ${svgW} ${svgH}" xmlns="http://www.w3.org/2000/svg">${lines}${nodes}</svg>`;
}

// ════════════════════════════════════════════
//  ESTADO DE LA APLICACIÓN
// ════════════════════════════════════════════

const favTree = new BST(); // Árbol de canciones favoritas
const recTree = new BST(); // Árbol de canciones recientes

// Datos iniciales tomados del enunciado del proyecto
const sampleFav = [
  new Song(50, 'Bohemian Rhapsody', 'Queen',       'Rock', '5:55'),
  new Song(30, 'Imagine',           'John Lennon',  'Rock', '3:07'),
  new Song(70, 'Hey Jude',          'The Beatles',  'Rock', '7:11'),
  new Song(20, 'Fix You',           'Coldplay',     'Rock', '4:55'),
  new Song(40, 'Yesterday',         'The Beatles',  'Rock', '2:05'),
  new Song(60, 'Let It Be',         'The Beatles',  'Rock', '4:03'),
  new Song(80, 'Hotel California',  'Eagles',       'Rock', '6:30'),
];
const sampleRec = [
  new Song(50, 'Bohemian Rhapsody', 'Queen',           'Rock',     '5:55'),
  new Song(25, 'Viva La Vida',      'Coldplay',         'Rock',     '4:02'),
  new Song(70, 'Hey Jude',          'The Beatles',      'Rock',     '7:11'),
  new Song(10, 'Believer',          'Imagine Dragons',  'Pop Rock', '3:24'),
  new Song(30, 'Imagine',           'John Lennon',      'Rock',     '3:07'),
  new Song(60, 'Let It Be',         'The Beatles',      'Rock',     '4:03'),
  new Song(90, 'Blinding Lights',   'The Weeknd',       'Pop',      '3:20'),
];

sampleFav.forEach(s => favTree.insert(s));
sampleRec.forEach(s => recTree.insert(s));

// ════════════════════════════════════════════
//  HELPERS DE DOM / UI
// ════════════════════════════════════════════

/** Agrega una línea de texto al panel de consola con color según tipo. */
function log(msg, type = 'info') {
  const cons = document.getElementById('console');
  const div  = document.createElement('div');
  div.className = `log-${type}`;
  div.textContent = `> ${msg}`;
  cons.appendChild(div);
  cons.scrollTop = cons.scrollHeight;
}

function clearConsole() {
  document.getElementById('console').innerHTML = '';
}

/** Retorna el destino activo: 'fav', 'rec' o 'both'. */
function getTarget() {
  const active = document.querySelector('.target-tab[class*="active"]');
  return active ? active.dataset.target : 'fav';
}

/** Actualiza los números en las tarjetas de estadísticas. */
function updateStats() {
  document.getElementById('stat-fav-count').textContent  = favTree.size();
  document.getElementById('stat-fav-height').textContent = favTree.height();
  document.getElementById('stat-rec-count').textContent  = recTree.size();
  document.getElementById('stat-rec-height').textContent = recTree.height();
}

/** Re-renderiza los SVGs de ambos árboles en pantalla. */
function renderTrees() {
  const favContainer = document.getElementById('tree-fav');
  const recContainer = document.getElementById('tree-rec');

  const favSVG = renderTreeSVG(favTree.root, '#1DB954');
  const recSVG = renderTreeSVG(recTree.root, '#1E90FF');

  favContainer.innerHTML = favSVG || '<div class="tree-empty">Árbol vacío</div>';
  recContainer.innerHTML = recSVG || '<div class="tree-empty">Árbol vacío</div>';

  document.getElementById('fav-count-label').textContent = `${favTree.size()} canciones`;
  document.getElementById('rec-count-label').textContent = `${recTree.size()} canciones`;
}

/**
 * Genera las filas HTML de la tabla de canciones.
 * @param {Song[]} songs - Lista de canciones a renderizar.
 * @param {Function} labelFn - Función que retorna el HTML del badge de lista.
 */
function songsToRows(songs, labelFn) {
  if (!songs.length) return '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:28px;font-style:italic">Sin canciones</td></tr>';
  return songs.map((s, i) => `
    <tr id="row-${s.id}">
      <td class="td-num">
        <span class="row-num">${i + 1}</span>
        <span class="row-play">▶</span>
      </td>
      <td class="td-id">${s.id}</td>
      <td class="td-name">${s.nombre}</td>
      <td class="td-secondary">${s.artista}</td>
      <td class="td-secondary">${s.genero}</td>
      <td class="td-secondary">${s.duracion}</td>
      <td>${labelFn ? labelFn(s) : ''}</td>
      <td><button class="td-del" onclick="deleteSong(${s.id})" title="Eliminar">✕</button></td>
    </tr>`).join('');
}

/** Renderiza la tabla con la unión de ambos árboles, etiquetando cada canción. */
function renderTable() {
  const tbody  = document.getElementById('song-tbody');
  const header = document.getElementById('table-header');

  const favIds = new Set(favTree.inOrder().map(s => s.id));
  const recIds = new Set(recTree.inOrder().map(s => s.id));
  const all    = union(favTree, recTree);

  header.textContent = `Todas las canciones — ${all.length} en total`;

  tbody.innerHTML = songsToRows(all, s => {
    const inFav = favIds.has(s.id);
    const inRec = recIds.has(s.id);
    if (inFav && inRec) return '<span class="td-tag both">Ambas</span>';
    if (inFav)          return '<span class="td-tag fav">Favorita</span>';
    return '<span class="td-tag rec">Reciente</span>';
  });
}

/** Refresca stats, SVGs y tabla. Se llama tras cualquier modificación. */
function refresh() {
  updateStats();
  renderTrees();
  renderTable();
}

// ════════════════════════════════════════════
//  ACCIONES DE USUARIO
// ════════════════════════════════════════════

/** Lee el formulario, valida y llama a BST.insert según destino activo. */
function insertSong() {
  const id      = document.getElementById('inp-id').value.trim();
  const nombre  = document.getElementById('inp-nombre').value.trim();
  const artista = document.getElementById('inp-artista').value.trim();
  const genero  = document.getElementById('inp-genero').value.trim();
  const dur     = document.getElementById('inp-dur').value.trim();
  const target  = getTarget();

  if (!id || !nombre || !artista || !genero || !dur) {
    log('Completa todos los campos.', 'error'); return;
  }
  if (isNaN(parseInt(id))) {
    log('El ID debe ser un número.', 'error'); return;
  }

  if (target === 'fav' || target === 'both') {
    const ok = favTree.insert(new Song(id, nombre, artista, genero, dur));
    log(ok ? `"${nombre}" insertada en Favoritas (ID ${id})` : `ID ${id} ya existe en Favoritas`, ok ? 'success' : 'warn');
  }
  if (target === 'rec' || target === 'both') {
    const ok = recTree.insert(new Song(id, nombre, artista, genero, dur));
    log(ok ? `"${nombre}" insertada en Recientes (ID ${id})` : `ID ${id} ya existe en Recientes`, ok ? 'success' : 'warn');
  }

  ['inp-id','inp-nombre','inp-artista','inp-genero','inp-dur'].forEach(id => document.getElementById(id).value = '');
  refresh();
}

/** Busca por ID, imprime resultado en consola y resalta la fila en la tabla. */
function searchSong() {
  const id     = document.getElementById('inp-search').value.trim();
  const target = getTarget();
  if (!id) { log('Ingresa un ID para buscar.', 'error'); return; }

  document.querySelectorAll('.highlight-row').forEach(r => r.classList.remove('highlight-row'));

  let found = false;
  if (target === 'fav' || target === 'both') {
    const s = favTree.search(id);
    if (s) { log(`✓ Encontrada en Favoritas → ${s.nombre} | ${s.artista} | ${s.genero} | ${s.duracion}`, 'success'); found = true; }
    else   { log(`ID ${id} no encontrado en Favoritas`, 'warn'); }
  }
  if (target === 'rec' || target === 'both') {
    const s = recTree.search(id);
    if (s) { log(`✓ Encontrada en Recientes → ${s.nombre} | ${s.artista} | ${s.genero} | ${s.duracion}`, 'blue'); found = true; }
    else   { log(`ID ${id} no encontrado en Recientes`, 'warn'); }
  }

  if (found) {
    const row = document.getElementById(`row-${id}`);
    if (row) { row.classList.add('highlight-row'); row.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }
}

/** Elimina canción por ID del/los árboles según destino activo. */
function deleteSong(id) {
  const target = getTarget();
  if (target === 'fav' || target === 'both') {
    const ok = favTree.delete(id);
    if (ok) log(`Eliminada de Favoritas: ID ${id}`, 'warn');
  }
  if (target === 'rec' || target === 'both') {
    const ok = recTree.delete(id);
    if (ok) log(`Eliminada de Recientes: ID ${id}`, 'warn');
  }
  refresh();
}

function deleteById() {
  const id = document.getElementById('inp-search').value.trim();
  if (!id) { log('Ingresa un ID para eliminar.', 'error'); return; }
  deleteSong(parseInt(id));
}

/** Imprime en consola el recorrido indicado del árbol activo. */
function showTraversal(type) {
  const tree  = getTarget() === 'rec' ? recTree : favTree;
  const label = getTarget() === 'rec' ? 'Recientes' : 'Favoritas';
  const result =
    type === 'in'   ? tree.inOrder()   :
    type === 'pre'  ? tree.preOrder()  :
                      tree.postOrder();

  const names  = result.map(s => `${s.id}:${s.nombre.split(' ')[0]}`).join(' → ');
  const tLabel = type === 'in' ? 'InOrden' : type === 'pre' ? 'PreOrden' : 'PostOrden';
  log(`${tLabel} (${label}): ${names || 'árbol vacío'}`, 'info');
}

function showHeight() {
  log(`Altura Favoritas: ${favTree.height()} | Altura Recientes: ${recTree.height()}`, 'info');
}

function showCardinality() {
  log(`Cardinalidad Favoritas: ${favTree.size()} canciones | Recientes: ${recTree.size()} canciones`, 'info');
}

/**
 * Muestra el resultado de una operación de conjunto en la tabla.
 * Reemplaza el contenido actual; usar "Ver todas" para restaurar.
 */
function showSetResult(songs, title, color) {
  const tbody  = document.getElementById('song-tbody');
  const header = document.getElementById('table-header');

  header.innerHTML = `<span style="color:${color}">${title}</span> — ${songs.length} canciones`;

  tbody.innerHTML = songs.length
    ? songs.map((s, i) => `
        <tr>
          <td class="td-num"><span class="row-num">${i + 1}</span><span class="row-play">▶</span></td>
          <td class="td-id">${s.id}</td>
          <td class="td-name">${s.nombre}</td>
          <td class="td-secondary">${s.artista}</td>
          <td class="td-secondary">${s.genero}</td>
          <td class="td-secondary">${s.duracion}</td>
          <td></td>
          <td></td>
        </tr>`).join('')
    : '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:28px;font-style:italic">Conjunto vacío</td></tr>';
}

function opUnion()        { const r = union(favTree, recTree);        log(`Unión (Fav ∪ Rec): ${r.length} canciones`, 'success'); showSetResult(r, '♥ ∪ ◷ Unión (Favoritas ∪ Recientes)', '#1DB954'); }
function opIntersection() { const r = intersection(favTree, recTree); log(`Intersección (Fav ∩ Rec): ${r.length} canciones en común`, 'success'); showSetResult(r, '♥ ∩ ◷ Intersección', '#F59B23'); }
function opDiffFavRec()   { const r = difference(favTree, recTree);   log(`Diferencia (Fav − Rec): ${r.length} canciones solo en Favoritas`, 'success'); showSetResult(r, '♥ − ◷ Diferencia (Fav − Rec)', '#1DB954'); }
function opDiffRecFav()   { const r = difference(recTree, favTree);   log(`Diferencia (Rec − Fav): ${r.length} canciones solo en Recientes`, 'blue');    showSetResult(r, '◷ − ♥ Diferencia (Rec − Fav)', '#1E90FF'); }

function resetTable() { renderTable(); }

/** Cambia el tab activo de destino y actualiza su clase CSS. */
function setTarget(el, type) {
  document.querySelectorAll('.target-tab').forEach(t => t.className = 'target-tab');
  el.classList.add(`active-${type}`);
}

// ════════════════════════════════════════════
//  INICIALIZACIÓN
// ════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  log('Sistema iniciado con datos de ejemplo del enunciado.', 'success');
  log('Árbol Favoritas: 7 canciones | Árbol Recientes: 7 canciones', 'info');
  refresh();
});