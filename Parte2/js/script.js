/* ═══════════════════════════════════════════════════════════
   SortLab — Parte 2: Algoritmos de Ordenamiento
   ═══════════════════════════════════════════════════════════ */

'use strict';

// Estado global de la aplicación
const state = {
  dataset:     [],    // arreglo de datos activo
  dataType:    'random',
  results:     [],    // resultados del último benchmark
  chartTime:   null,  // instancia Chart.js de tiempo
  chartOps:    null,  // instancia Chart.js de operaciones
  vizAnim:     null,  // referencia al setInterval del visualizador
  vizRunning:  false,
  vizPaused:   false,
  vizSteps:    [],    // pasos pre-calculados para la animación
  vizStep:     0,
  csvData:     null,  // { headers, rows, numericCols } del CSV cargado
};

// ── ALGORITMOS ────────────────────────────────────────────────
// Cada función recibe una copia del arreglo y devuelve { sorted, comps, swaps }
// para no mutar el dataset original y poder medir operaciones exactas.

function bubbleSort(arr) {
  const a = [...arr]; let comps = 0, swaps = 0;
  // Cada pasada "burbujea" el mayor al final; se acorta con cada iteración externa
  for (let i = 0; i < a.length - 1; i++)
    for (let j = 0; j < a.length - i - 1; j++) {
      comps++;
      if (a[j] > a[j+1]) { [a[j], a[j+1]] = [a[j+1], a[j]]; swaps++; }
    }
  return { sorted: a, comps, swaps };
}

function selectionSort(arr) {
  const a = [...arr]; let comps = 0, swaps = 0;
  // Busca el mínimo en el subarreglo no ordenado y lo coloca al inicio
  for (let i = 0; i < a.length - 1; i++) {
    let min = i;
    for (let j = i+1; j < a.length; j++) { comps++; if (a[j] < a[min]) min = j; }
    if (min !== i) { [a[i], a[min]] = [a[min], a[i]]; swaps++; }
  }
  return { sorted: a, comps, swaps };
}

function insertionSort(arr) {
  const a = [...arr]; let comps = 0, swaps = 0;
  // Inserta cada elemento en su posición correcta dentro de la parte ya ordenada
  for (let i = 1; i < a.length; i++) {
    let key = a[i], j = i - 1;
    while (j >= 0 && (comps++, a[j] > key)) { a[j+1] = a[j]; j--; swaps++; }
    a[j+1] = key;
  }
  return { sorted: a, comps, swaps };
}

function mergeSort(arr) {
  let comps = 0, swaps = 0;
  // Combina dos subarreglos ya ordenados en uno solo
  function merge(left, right) {
    const res = []; let i = 0, j = 0;
    while (i < left.length && j < right.length) {
      comps++;
      if (left[i] <= right[j]) res.push(left[i++]);
      else { res.push(right[j++]); swaps++; }
    }
    return res.concat(left.slice(i), right.slice(j));
  }
  // Divide recursivamente hasta subarreglos de 1 elemento, luego combina
  function ms(a) {
    if (a.length <= 1) return a;
    const mid = Math.floor(a.length / 2);
    return merge(ms(a.slice(0, mid)), ms(a.slice(mid)));
  }
  return { sorted: ms([...arr]), comps, swaps };
}

function quickSort(arr) {
  let comps = 0, swaps = 0;
  function qs(a, lo, hi) {
    if (lo >= hi) return;
    // Pivote = último elemento; reorganiza menores a la izquierda, mayores a la derecha
    let pivot = a[hi], i = lo;
    for (let j = lo; j < hi; j++) {
      comps++;
      if (a[j] <= pivot) { [a[j], a[i]] = [a[i], a[j]]; swaps++; i++; }
    }
    [a[i], a[hi]] = [a[hi], a[i]]; swaps++;
    qs(a, lo, i - 1);
    qs(a, i + 1, hi);
  }
  const a = [...arr];
  qs(a, 0, a.length - 1);
  return { sorted: a, comps, swaps };
}

function heapSort(arr) {
  const a = [...arr]; let comps = 0, swaps = 0;
  // Mantiene la propiedad de max-heap: padre >= hijos
  function heapify(n, i) {
    let largest = i, l = 2*i+1, r = 2*i+2;
    if (l < n) { comps++; if (a[l] > a[largest]) largest = l; }
    if (r < n) { comps++; if (a[r] > a[largest]) largest = r; }
    if (largest !== i) { [a[i], a[largest]] = [a[largest], a[i]]; swaps++; heapify(n, largest); }
  }
  // Fase 1: construir el heap desde el último nodo no-hoja hacia arriba
  for (let i = Math.floor(a.length/2)-1; i >= 0; i--) heapify(a.length, i);
  // Fase 2: extraer el máximo repetidamente al final del arreglo
  for (let i = a.length-1; i > 0; i--) { [a[0], a[i]] = [a[i], a[0]]; swaps++; heapify(i, 0); }
  return { sorted: a, comps, swaps };
}

function countingSort(arr) {
  const a = [...arr]; let comps = 0, swaps = 0;
  const min = Math.min(...a), max = Math.max(...a);
  const range = max - min + 1;

  // Cuenta cuántas veces aparece cada valor (offset por min para soportar negativos)
  const count = new Array(range).fill(0);
  const output = new Array(a.length);
  for (let i = 0; i < a.length; i++) { count[a[i] - min]++; comps++; }

  // Acumulado: count[i] pasa a indicar la posición final del valor (i + min)
  for (let i = 1; i < count.length; i++) { count[i] += count[i-1]; swaps++; }

  // Coloca cada elemento en su posición correcta (recorrido inverso = estable)
  for (let i = a.length - 1; i >= 0; i--) {
    output[count[a[i] - min] - 1] = a[i];
    count[a[i] - min]--;
  }
  return { sorted: output, comps, swaps };
}

// Registro central de algoritmos: función, etiqueta visual y complejidad teórica
const ALGORITHMS = {
  bubble:    { fn: bubbleSort,    label: 'Bubble Sort',    color: '#f15e6c', complexity: 'O(n²) / O(n²)' },
  selection: { fn: selectionSort, label: 'Selection Sort', color: '#f59b23', complexity: 'O(n²) / O(n²)' },
  insertion: { fn: insertionSort, label: 'Insertion Sort', color: '#a855f7', complexity: 'O(n) / O(n²)'  },
  merge:     { fn: mergeSort,     label: 'Merge Sort',     color: '#3b82f6', complexity: 'O(n log n) / O(n log n)' },
  quick:     { fn: quickSort,     label: 'Quick Sort',     color: '#06b6d4', complexity: 'O(n log n) / O(n²)' },
  heap:      { fn: heapSort,      label: 'Heap Sort',      color: '#ec4899', complexity: 'O(n log n) / O(n log n)' },
  counting:  { fn: countingSort,  label: 'Counting Sort',  color: '#1DB954', complexity: 'O(n+k) / O(n+k)' },
};

// ── GENERACIÓN DE DATASETS ────────────────────────────────────
function generateDataset(type, size, range) {
  const r = () => Math.floor(Math.random() * range) + 1;
  switch (type) {
    case 'random':   return Array.from({ length: size }, r);
    // Distribuye linealmente los valores de 1..range
    case 'sorted':   return Array.from({ length: size }, (_, i) => Math.floor(i * range / size) + 1);
    case 'reverse':  return Array.from({ length: size }, (_, i) => Math.floor((size - i) * range / size) + 1);
    // Pool de 5 valores fijos para forzar alta repetición
    case 'repeated': {
      const pool = [Math.floor(range*0.1), Math.floor(range*0.3), Math.floor(range*0.5), Math.floor(range*0.7), Math.floor(range*0.9)];
      return Array.from({ length: size }, () => pool[Math.floor(Math.random() * pool.length)]);
    }
    default: return Array.from({ length: size }, r);
  }
}

// ── CONSOLA ───────────────────────────────────────────────────
function clog(msg, cls = 'log-info') {
  const el = document.getElementById('console');
  const line = document.createElement('div');
  line.className = cls;
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

// ── ESTADÍSTICAS ──────────────────────────────────────────────
function updateStats() {
  document.getElementById('statSize').textContent = state.dataset.length.toLocaleString();
  const typeLabels = { random:'Aleatorio', sorted:'Ordenado', reverse:'Inverso', repeated:'Repetidos', csv:'CSV' };
  document.getElementById('statType').textContent = typeLabels[state.dataType] || state.dataType;
  const min = Math.min(...state.dataset), max = Math.max(...state.dataset);
  document.getElementById('statTypeRange').textContent = `min ${min} · max ${max}`;
}

function updateBenchmarkStats(results) {
  const sorted = [...results].sort((a, b) => a.time - b.time);
  document.getElementById('statFastest').textContent = sorted[0].label.split(' ')[0];
  document.getElementById('statFastestTime').textContent = sorted[0].time.toFixed(3) + ' ms';
  document.getElementById('statSlowest').textContent = sorted[sorted.length-1].label.split(' ')[0];
  document.getElementById('statSlowestTime').textContent = sorted[sorted.length-1].time.toFixed(3) + ' ms';
}

// ── GRÁFICAS ──────────────────────────────────────────────────
function buildCharts(results) {
  const labels = results.map(r => r.label);
  const colors = results.map(r => r.color);

  // Destruir instancias anteriores antes de crear nuevas (evita memory leaks)
  if (state.chartTime) state.chartTime.destroy();
  if (state.chartOps)  state.chartOps.destroy();

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#242424', titleColor: '#fff', bodyColor: '#a7a7a7', borderColor: '#303030', borderWidth: 1 }
    },
    scales: {
      x: { ticks: { color: '#6a6a6a', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,.05)' } },
      y: { ticks: { color: '#6a6a6a', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,.05)' }, beginAtZero: true }
    }
  };

  state.chartTime = new Chart(document.getElementById('chartTime'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Tiempo (ms)',
        data: results.map(r => +r.time.toFixed(4)),
        backgroundColor: colors.map(c => c + '99'),
        borderColor: colors,
        borderWidth: 2,
        borderRadius: 6,
      }]
    },
    options: { ...chartDefaults }
  });

  state.chartOps = new Chart(document.getElementById('chartOps'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Comparaciones',
          data: results.map(r => r.comps),
          backgroundColor: colors.map(c => c + '80'),
          borderColor: colors,
          borderWidth: 2,
          borderRadius: 4,
        },
        {
          label: 'Intercambios',
          data: results.map(r => r.swaps),
          backgroundColor: colors.map(c => c + '40'),
          borderColor: colors.map(c => c + 'aa'),
          borderWidth: 1.5,
          borderRadius: 4,
          borderDash: [4,2],
        }
      ]
    },
    options: {
      ...chartDefaults,
      plugins: {
        ...chartDefaults.plugins,
        legend: {
          display: true,
          labels: { color: '#a7a7a7', font: { size: 11 }, boxWidth: 12, padding: 12 }
        }
      }
    }
  });

  document.getElementById('chartTimeCount').textContent = results.length + ' runs';
  document.getElementById('chartOpsCount').textContent  = results.length + ' runs';
}

// ── TABLA DE RESULTADOS ───────────────────────────────────────

/*
 * Uso de Counting Sort para ordenar los resultados del benchmark por tiempo.
 * Los tiempos en ms (flotantes) se discretizan multiplicando por 100
 * para trabajar con índices enteros, cumpliendo el requisito de usar
 * Counting Sort en alguna operación de búsqueda/ordenamiento de la UI.
 */
function sortResultsByTimeWithCounting(results) {
  if (results.length <= 1) return results;
  const factor = 100; // precisión de 0.01 ms
  const vals = results.map(r => Math.round(r.time * factor));
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min + 1;
  const count = new Array(range).fill(0);
  vals.forEach(v => count[v - min]++);
  for (let i = 1; i < count.length; i++) count[i] += count[i-1];
  const output = new Array(results.length);
  // Recorrido inverso para mantener estabilidad
  for (let i = results.length - 1; i >= 0; i--) {
    const idx = count[vals[i] - min] - 1;
    output[idx] = results[i];
    count[vals[i] - min]--;
  }
  return output;
}

function renderTable(results) {
  const tbody = document.getElementById('resultsBody');
  const sorted = sortResultsByTimeWithCounting(results);
  tbody.innerHTML = '';
  sorted.forEach((r, i) => {
    const tr = document.createElement('tr');
    const tag = i === 0 ? `<span class="td-tag fav">🏆 más rápido</span>` :
                i === sorted.length - 1 ? `<span class="td-tag rec">🐢 más lento</span>` : '';
    tr.innerHTML = `
      <td class="td-num"><span class="row-num">${i+1}</span><span class="row-play">▶</span></td>
      <td class="td-name" style="color:${r.color};">${r.label}</td>
      <td class="td-secondary">${r.dataType}</td>
      <td class="td-id">${r.n.toLocaleString()}</td>
      <td class="td-secondary"><strong style="color:${r.color}">${r.time.toFixed(3)}</strong> ms ${tag}</td>
      <td class="td-secondary">${r.comps.toLocaleString()}</td>
      <td class="td-secondary">${r.swaps.toLocaleString()}</td>
      <td class="td-secondary" style="font-size:11px;color:var(--text-muted);">${r.complexity}</td>
    `;
    tbody.appendChild(tr);
  });
  document.getElementById('resultCount').textContent = `(${results.length} resultados — ordenados por Counting Sort)`;
}

// ── CONCLUSIONES ──────────────────────────────────────────────
const CONCLUSIONS = [
  { algo:'Bubble Sort',    icon:'🫧', text:'Útil solo para aprender. Muy lento en datos grandes. Mejor para listas casi ordenadas pequeñas.' },
  { algo:'Selection Sort', icon:'🎯', text:'Minimiza intercambios. Útil cuando escribir en memoria es costoso y el dataset es pequeño.' },
  { algo:'Insertion Sort', icon:'🃏', text:'Excelente para datos casi ordenados (O(n)). Ideal para insertar elementos en listas ya ordenadas.' },
  { algo:'Merge Sort',     icon:'⚖️', text:'Estable y predecible O(n log n). Ideal para grandes volúmenes y cuando se necesita estabilidad.' },
  { algo:'Quick Sort',     icon:'⚡', text:'El más rápido en promedio en la práctica. Cuidado con datos repetidos o casi ordenados (usar pivot aleatorio).' },
  { algo:'Heap Sort',      icon:'🏔️', text:'Garantiza O(n log n) en el peor caso. Buen balance, útil cuando Merge Sort usa demasiada memoria.' },
  { algo:'Counting Sort',  icon:'🔢', text:'Lineal O(n+k) cuando el rango es pequeño. Perfecto para enteros con rango acotado (ej. calificaciones, edades).' },
];

function renderConclusions() {
  const grid = document.getElementById('conclusionsGrid');
  grid.innerHTML = '';
  CONCLUSIONS.forEach(c => {
    const div = document.createElement('div');
    div.style.cssText = 'background:var(--bg-card);border:1px solid rgba(255,255,255,.06);border-radius:var(--radius-md);padding:14px 16px;';
    div.innerHTML = `
      <div style="font-size:22px;margin-bottom:8px;">${c.icon}</div>
      <div style="font-family:var(--font-display);font-weight:700;font-size:13px;margin-bottom:6px;">${c.algo}</div>
      <div style="font-size:12px;color:var(--text-secondary);line-height:1.6;">${c.text}</div>
    `;
    grid.appendChild(div);
  });
}

// ── EXPORTAR CSV ──────────────────────────────────────────────
function exportCSV() {
  if (!state.results.length) return clog('» Sin resultados para exportar.', 'log-warn');
  const headers = 'Algoritmo,Tipo,n,Tiempo_ms,Comparaciones,Intercambios,Complejidad';
  const rows = state.results.map(r =>
    `${r.label},${r.dataType},${r.n},${r.time.toFixed(4)},${r.comps},${r.swaps},"${r.complexity}"`
  );
  const blob = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `sortlab_results_${Date.now()}.csv`;
  a.click();
  clog('» Resultados exportados a CSV.', 'log-success');
}

// ── BENCHMARK ─────────────────────────────────────────────────
async function runBenchmark() {
  if (!state.dataset.length) {
    clog('» Primero genera un dataset.', 'log-warn'); return;
  }
  const selected = [...document.querySelectorAll('.algo-check:checked')].map(c => c.value);
  if (!selected.length) {
    clog('» Selecciona al menos un algoritmo.', 'log-warn'); return;
  }

  clog(`\n» Iniciando benchmark · n=${state.dataset.length} · tipo=${state.dataType}`, 'log-blue');
  state.results = [];

  for (const key of selected) {
    const algo = ALGORITHMS[key];

    // Warmup: primera ejecución para calentar el JIT del navegador y evitar
    // que el primer algoritmo tenga tiempos inflados por compilación
    algo.fn([...state.dataset]);

    const t0 = performance.now();
    const res = algo.fn([...state.dataset]);
    const t1 = performance.now();

    state.results.push({
      key,
      label:      algo.label,
      color:      algo.color,
      complexity: algo.complexity,
      dataType:   state.dataType,
      n:          state.dataset.length,
      time:       t1 - t0,
      comps:      res.comps,
      swaps:      res.swaps,
    });
    clog(`  ✓ ${algo.label.padEnd(18)} ${(t1-t0).toFixed(3).padStart(9)} ms  |  comp: ${res.comps.toLocaleString()}  swap: ${res.swaps.toLocaleString()}`, 'log-success');

    // Cede control al navegador entre algoritmos para no bloquear el hilo principal
    await new Promise(r => setTimeout(r, 0));
  }

  clog(`» Benchmark completo. Tabla ordenada con Counting Sort.`, 'log-info');
  buildCharts(state.results);
  renderTable(state.results);
  updateBenchmarkStats(state.results);
}

// ── VISUALIZADOR ──────────────────────────────────────────────
// Colores por estado de cada barra en la animación
const VIZ_COLORS = {
  normal:   'rgba(255,255,255,.18)',
  compare:  '#1DB954',  // verde  → comparando
  swap:     '#3b82f6',  // azul   → intercambiando / colocando
  sorted:   '#a855f7',  // morado → ya en posición final
  pivot:    '#f59b23',  // naranja → pivote activo (Quick Sort)
};

/*
 * Funciones recordSteps_*: simulan el algoritmo paso a paso y guardan
 * una instantánea del arreglo en cada operación relevante.
 * Cada paso es un objeto { arr, hi, swap, done } donde:
 *   - arr:  copia del arreglo en ese momento
 *   - hi:   índices destacados (comparación o intercambio)
 *   - swap: true si fue intercambio, false si fue comparación
 *   - done: Set de índices ya en su posición final
 */

function recordSteps_bubble(arr) {
  const a = [...arr]; const steps = []; const done = new Set();
  for (let i = 0; i < a.length - 1; i++) {
    for (let j = 0; j < a.length - i - 1; j++) {
      steps.push({ arr: [...a], hi: [j, j+1], swap: false, done: new Set(done) });
      if (a[j] > a[j+1]) { [a[j], a[j+1]] = [a[j+1], a[j]]; steps.push({ arr: [...a], hi: [j, j+1], swap: true, done: new Set(done) }); }
    }
    done.add(a.length - 1 - i);
  }
  done.add(0);
  steps.push({ arr: [...a], hi: [], swap: false, done: new Set([...Array(a.length).keys()]) });
  return steps;
}

function recordSteps_insertion(arr) {
  const a = [...arr]; const steps = []; const done = new Set([0]);
  for (let i = 1; i < a.length; i++) {
    let j = i;
    steps.push({ arr: [...a], hi: [j], swap: false, done: new Set(done) });
    while (j > 0 && a[j-1] > a[j]) {
      [a[j], a[j-1]] = [a[j-1], a[j]];
      steps.push({ arr: [...a], hi: [j, j-1], swap: true, done: new Set(done) });
      j--;
    }
    done.add(i);
  }
  steps.push({ arr: [...a], hi: [], swap: false, done: new Set([...Array(a.length).keys()]) });
  return steps;
}

function recordSteps_selection(arr) {
  const a = [...arr]; const steps = []; const done = new Set();
  for (let i = 0; i < a.length - 1; i++) {
    let min = i;
    for (let j = i+1; j < a.length; j++) {
      steps.push({ arr: [...a], hi: [min, j], swap: false, done: new Set(done) });
      if (a[j] < a[min]) min = j;
    }
    if (min !== i) { [a[i], a[min]] = [a[min], a[i]]; steps.push({ arr: [...a], hi: [i, min], swap: true, done: new Set(done) }); }
    done.add(i);
  }
  steps.push({ arr: [...a], hi: [], swap: false, done: new Set([...Array(a.length).keys()]) });
  return steps;
}

function recordSteps_counting(arr) {
  const a = [...arr]; const steps = [];
  const min = Math.min(...a), max = Math.max(...a);
  const range = max - min + 1;
  const count = new Array(range).fill(0);

  // Fase 1: contar — resalta el elemento que se está contando
  for (let i = 0; i < a.length; i++) {
    count[a[i]-min]++;
    steps.push({ arr: [...a], hi: [i], swap: false, done: new Set(), phase: 'counting' });
  }
  // Fase 2: acumulado (interno, sin pasos visuales)
  for (let i = 1; i < count.length; i++) count[i] += count[i-1];
  // Fase 3: colocar — muestra cada elemento moviéndose a su posición final
  const output = new Array(a.length);
  const orig = [...a];
  const placed = new Set();
  for (let i = a.length - 1; i >= 0; i--) {
    const pos = count[orig[i]-min] - 1;
    output[pos] = orig[i];
    count[orig[i]-min]--;
    placed.add(pos);
    const display = [...a]; placed.forEach(p => display[p] = output[p]);
    steps.push({ arr: display, hi: [i, pos], swap: true, done: new Set(placed), phase: 'placing' });
  }
  steps.push({ arr: output, hi: [], swap: false, done: new Set([...Array(a.length).keys()]) });
  return steps;
}

function recordSteps_merge(arr) {
  const a = [...arr]; const steps = [];
  function mergeStep(arr, lo, mid, hi) {
    const left = arr.slice(lo, mid+1), right = arr.slice(mid+1, hi+1);
    let i=0,j=0,k=lo;
    while(i<left.length&&j<right.length){
      steps.push({arr:[...arr],hi:[lo+i,mid+1+j],swap:false,done:new Set()});
      if(left[i]<=right[j]){arr[k++]=left[i++];}else{arr[k++]=right[j++];}
      steps.push({arr:[...arr],hi:[k-1],swap:true,done:new Set()});
    }
    while(i<left.length){arr[k++]=left[i++];steps.push({arr:[...arr],hi:[k-1],swap:true,done:new Set()});}
    while(j<right.length){arr[k++]=right[j++];steps.push({arr:[...arr],hi:[k-1],swap:true,done:new Set()});}
  }
  function ms(arr,lo,hi){
    if(lo>=hi)return;
    const mid=Math.floor((lo+hi)/2);
    ms(arr,lo,mid);ms(arr,mid+1,hi);mergeStep(arr,lo,mid,hi);
  }
  ms(a,0,a.length-1);
  steps.push({arr:[...a],hi:[],swap:false,done:new Set([...Array(a.length).keys()])});
  return steps;
}

function recordSteps_quick(arr) {
  const a = [...arr]; const steps = []; const done = new Set();
  function partition(lo, hi) {
    const pivot = a[hi]; let i = lo;
    for (let j = lo; j < hi; j++) {
      steps.push({ arr:[...a], hi:[j,hi], swap:false, done:new Set(done), pivot:hi });
      if (a[j]<=pivot) { [a[j],a[i]]=[a[i],a[j]]; steps.push({arr:[...a],hi:[j,i],swap:true,done:new Set(done),pivot:hi}); i++; }
    }
    // Pivote queda en su posición definitiva
    [a[i],a[hi]]=[a[hi],a[i]]; done.add(i);
    steps.push({ arr:[...a], hi:[i], swap:true, done:new Set(done), pivot:i });
    return i;
  }
  function qs(lo,hi){
    if(lo>=hi){if(lo===hi)done.add(lo);return;}
    const p=partition(lo,hi); qs(lo,p-1); qs(p+1,hi);
  }
  qs(0,a.length-1);
  steps.push({arr:[...a],hi:[],swap:false,done:new Set([...Array(a.length).keys()])});
  return steps;
}

function recordSteps_heap(arr) {
  const a = [...arr]; const steps = []; const done = new Set();
  function heapify(n, i) {
    let largest=i,l=2*i+1,r=2*i+2;
    if(l<n){steps.push({arr:[...a],hi:[largest,l],swap:false,done:new Set(done)});if(a[l]>a[largest])largest=l;}
    if(r<n){steps.push({arr:[...a],hi:[largest,r],swap:false,done:new Set(done)});if(a[r]>a[largest])largest=r;}
    if(largest!==i){[a[i],a[largest]]=[a[largest],a[i]];steps.push({arr:[...a],hi:[i,largest],swap:true,done:new Set(done)});heapify(n,largest);}
  }
  for(let i=Math.floor(a.length/2)-1;i>=0;i--)heapify(a.length,i);
  for(let i=a.length-1;i>0;i--){[a[0],a[i]]=[a[i],a[0]];done.add(i);steps.push({arr:[...a],hi:[0,i],swap:true,done:new Set(done)});heapify(i,0);}
  steps.push({arr:[...a],hi:[],swap:false,done:new Set([...Array(a.length).keys()])});
  return steps;
}

// Mapa de clave → función generadora de pasos
const VIZ_STEP_RECORDERS = {
  bubble:    recordSteps_bubble,
  selection: recordSteps_selection,
  insertion: recordSteps_insertion,
  merge:     recordSteps_merge,
  quick:     recordSteps_quick,
  heap:      recordSteps_heap,
  counting:  recordSteps_counting,
};

// Dibuja un único paso en el canvas usando las dimensiones fijas W x H
function drawVizStep(step, canvas, W, H) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  const arr = step.arr;
  const n = arr.length;
  const maxVal = Math.max(...arr);
  const gap = 1;
  const barW = (W - gap * (n - 1)) / n;

  arr.forEach((v, i) => {
    const h = Math.max(4, (v / maxVal) * (H - 20));
    const x = i * (barW + gap);
    const y = H - h;

    // Prioridad de color: pivote > intercambio/comparación > ordenado > normal
    let color = VIZ_COLORS.normal;
    if (step.done && step.done.has(i)) color = VIZ_COLORS.sorted;
    if (step.hi && step.hi.includes(i)) color = step.swap ? VIZ_COLORS.swap : VIZ_COLORS.compare;
    if (step.pivot === i) color = VIZ_COLORS.pivot;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, Math.max(barW - 1, 1), h, barW > 6 ? 2 : 0);
    ctx.fill();
  });
}

function startViz() {
  const key   = document.getElementById('vizAlgo').value;
  const size  = Math.min(120, Math.max(8, +document.getElementById('vizSize').value));
  const speed = Math.max(5, +document.getElementById('vizSpeed').value);

  if (state.vizAnim) clearInterval(state.vizAnim);
  state.vizPaused = false;
  state.vizRunning = true;

  const arr = generateDataset('random', size, 200);
  state.vizSteps = VIZ_STEP_RECORDERS[key](arr);
  state.vizStep  = 0;

  const canvas = document.getElementById('vizCanvas');

  // Las dimensiones se fijan UNA SOLA VEZ antes de iniciar el loop.
  // Si se leyera canvas.offsetWidth dentro del setInterval, cada frame
  // que reasigna canvas.width provocaría un recálculo de layout que
  // encogería el canvas progresivamente (bug de shrink loop).
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.parentElement.clientWidth - 40;
  const cssH = 160;
  canvas.style.width  = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.width  = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const W = canvas.width;
  const H = canvas.height;

  const total = state.vizSteps.length;
  document.getElementById('vizTitle').textContent = `— ${ALGORITHMS[key].label}`;

  state.vizAnim = setInterval(() => {
    if (state.vizPaused) return;
    if (state.vizStep >= total) {
      clearInterval(state.vizAnim);
      state.vizRunning = false;
      document.getElementById('vizStepLabel').textContent = `completado · ${total} pasos`;
      return;
    }
    drawVizStep(state.vizSteps[state.vizStep], canvas, W, H);
    document.getElementById('vizStepLabel').textContent = `paso ${state.vizStep+1} / ${total}`;
    state.vizStep++;
  }, speed);
}

function pauseViz() {
  state.vizPaused = !state.vizPaused;
  document.getElementById('btnVizPause').textContent = state.vizPaused ? '▶ Reanudar' : '⏸ Pausar';
}

function resetViz() {
  if (state.vizAnim) clearInterval(state.vizAnim);
  state.vizRunning = false;
  state.vizPaused  = false;
  state.vizStep    = 0;
  document.getElementById('btnVizPause').textContent = '⏸ Pausar';
  document.getElementById('vizStepLabel').textContent = 'paso 0 / 0';
  document.getElementById('vizTitle').textContent = '— selecciona un algoritmo';
  const canvas = document.getElementById('vizCanvas');
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

// ── CONSTRUCCIÓN DE UI ────────────────────────────────────────
function buildAlgoCheckboxes() {
  const wrap = document.getElementById('algoCheckboxes');
  Object.entries(ALGORITHMS).forEach(([key, algo]) => {
    const label = document.createElement('label');
    label.style.cssText = 'display:flex;align-items:center;gap:8px;cursor:pointer;padding:5px 6px;border-radius:6px;transition:background .12s;';
    label.onmouseenter = () => label.style.background = 'var(--bg-card)';
    label.onmouseleave = () => label.style.background = '';
    label.innerHTML = `
      <input type="checkbox" class="algo-check" value="${key}" checked
        style="accent-color:${algo.color};width:14px;height:14px;cursor:pointer;" />
      <span style="width:10px;height:10px;border-radius:50%;background:${algo.color};flex-shrink:0;box-shadow:0 0 6px ${algo.color}55;"></span>
      <span style="font-size:12px;font-weight:500;">${algo.label}</span>
      <span style="margin-left:auto;font-size:10px;color:var(--text-muted);font-family:var(--font-mono);">${algo.complexity.split(' / ')[0]}</span>
    `;
    wrap.appendChild(label);
  });
}

function setupDataTypeTabs() {
  const allTabs = [...document.querySelectorAll('#dataTypeTabs .target-tab, #dataTypeTabs2 .target-tab')];
  allTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      if (tab.dataset.type === 'csv') {
        allTabs.forEach(t => { t.className = 'target-tab'; });
        tab.classList.add('active-both');
        state.dataType = 'csv';
        document.getElementById('csvGroup').style.display = '';
        return;
      }
      document.getElementById('csvGroup').style.display = 'none';
      allTabs.forEach(t => { t.className = 'target-tab'; });
      tab.classList.add('active-fav');
      state.dataType = tab.dataset.type;
    });
  });
}

// ── CARGA DE CSV ──────────────────────────────────────────────

// Parsea el CSV y devuelve { headers, rows }
function parseCSVRaw(text) {
  const lines = text.trim().split('\n').map(l => l.split(',').map(c => c.trim()));
  return { headers: lines[0], rows: lines.slice(1) };
}

// Detecta columnas cuyo 80%+ de valores son numéricos
function detectNumericColumns(headers, rows) {
  return headers.reduce((acc, h, i) => {
    const numericCount = rows.filter(r => r[i] !== undefined && !isNaN(parseFloat(r[i]))).length;
    if (numericCount > rows.length * 0.8) acc.push({ index: i, name: h });
    return acc;
  }, []);
}

// Extrae una columna como array de enteros positivos
function extractColumn(rows, colIndex) {
  return rows
    .map(r => parseFloat(r[colIndex]))
    .filter(n => !isNaN(n) && Number.isFinite(n))
    .map(n => Math.round(Math.abs(n)));
}

// Lee el archivo, detecta columnas numéricas y las expone en la UI
function loadCSVAndDetect(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const { headers, rows } = parseCSVRaw(e.target.result);
        const numericCols = detectNumericColumns(headers, rows);
        if (!numericCols.length) { reject(new Error('Sin columnas numéricas')); return; }
        resolve({ headers, rows, numericCols });
      } catch(err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// Puebla el <select> con las columnas numéricas detectadas
function renderColumnSelector(numericCols) {
  const wrap = document.getElementById('csvColWrap');
  const sel  = document.getElementById('csvColSelect');
  sel.innerHTML = '';
  numericCols.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.index;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });
  wrap.style.display = '';
}

// ── INICIALIZACIÓN ────────────────────────────────────────────
function init() {
  buildAlgoCheckboxes();
  setupDataTypeTabs();
  renderConclusions();

  // Al seleccionar archivo: detecta columnas numéricas y muestra el selector
  document.getElementById('csvFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById('csvColWrap').style.display = 'none';
    document.getElementById('csvInfo').textContent = 'Analizando...';
    try {
      state.csvData = await loadCSVAndDetect(file);
      renderColumnSelector(state.csvData.numericCols);
      document.getElementById('csvInfo').textContent =
        `${state.csvData.rows.length} filas · ${state.csvData.numericCols.length} columnas numéricas`;
    } catch(err) {
      document.getElementById('csvInfo').textContent = 'Error: ' + err.message;
      state.csvData = null;
    }
  });

  document.getElementById('btnGenerate').addEventListener('click', async () => {
    const size  = Math.min(100000, Math.max(10, +document.getElementById('dataSize').value));
    const range = Math.min(99999,  Math.max(2,  +document.getElementById('dataRange').value));

    if (state.dataType === 'csv') {
      if (!state.csvData) { clog('» Carga un archivo CSV primero.', 'log-warn'); return; }
      const colIndex = +document.getElementById('csvColSelect').value;
      const colName  = state.csvData.headers[colIndex];
      state.dataset  = extractColumn(state.csvData.rows, colIndex);
      if (!state.dataset.length) { clog('» La columna seleccionada no tiene datos válidos.', 'log-warn'); return; }
      clog(`» CSV cargado: columna "${colName}" · ${state.dataset.length} elementos.`, 'log-success');
    } else {
      state.dataset = generateDataset(state.dataType, size, range);
      clog(`» Dataset generado: n=${state.dataset.length} · tipo=${state.dataType} · rango 1..${range}`, 'log-info');
    }
    updateStats();
  });

  document.getElementById('btnRun').addEventListener('click', runBenchmark);

  document.getElementById('btnClearResults').addEventListener('click', () => {
    state.results = [];
    document.getElementById('resultsBody').innerHTML =
      '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:32px;">Sin resultados aún.</td></tr>';
    if (state.chartTime) { state.chartTime.destroy(); state.chartTime = null; }
    if (state.chartOps)  { state.chartOps.destroy();  state.chartOps  = null; }
    document.getElementById('chartTimeCount').textContent = '0 runs';
    document.getElementById('chartOpsCount').textContent  = '0 runs';
    clog('» Resultados borrados.', 'log-warn');
  });

  document.getElementById('consoleClear').addEventListener('click', () => {
    document.getElementById('console').innerHTML = '';
  });

  document.getElementById('btnExport').addEventListener('click', exportCSV);
  document.getElementById('btnVizStart').addEventListener('click', startViz);
  document.getElementById('btnVizPause').addEventListener('click', pauseViz);
  document.getElementById('btnVizReset').addEventListener('click', resetViz);

  // Dataset de ejemplo al cargar la página
  state.dataType = 'random';
  state.dataset  = generateDataset('random', 500, 1000);
  updateStats();
  clog('» Dataset inicial generado: n=500 · aleatorio.', 'log-success');
}

document.addEventListener('DOMContentLoaded', init);