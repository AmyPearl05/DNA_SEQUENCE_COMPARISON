import { compareSequences, normalizeSequence } from './lcs.js';

const select = selector => document.querySelector(selector);
const examples = {
  classic: ['ATGCTAGCTAGCATCG', 'ATGCGATCTAGCTACG'],
  identical: ['ACGTACGTACGT', 'ACGTACGTACGT'],
  different: ['AAAAAA', 'TTTTTT'],
  short: ['ACGTAC', 'AGCTAC']
};
let result;
let currentView = 'comparison';
let uploadTarget = 'a';
let traceIndex = -1;
let toastTimeout;
let tableLimit = 28;

function notify(message) {
  select('#toast').textContent = message;
  select('#toast').hidden = false;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { select('#toast').hidden = true; }, 3500);
}

function setView(view) {
  currentView = view;
  select('#comparison-view').hidden = view !== 'comparison';
  select('#guide-view').hidden = view !== 'guide';
  select('#dp-section').hidden = view === 'guide';
  document.querySelectorAll('[data-view]').forEach(button => {
    button.classList.toggle('active', button.dataset.view === view);
    if (button.getAttribute('role') === 'tab') button.setAttribute('aria-selected', String(button.dataset.view === view));
  });
  select('.breadcrumb span').textContent = { comparison: 'DNA comparison', dp: 'DP explorer', guide: 'Algorithm guide' }[view];
  select('#explore-table').hidden = view === 'dp';
  select('.trace-actions').hidden = view !== 'dp';
  tableLimit = view === 'dp' ? 60 : 28;
  if (result) renderTable();
}

function updateCount(side) {
  const raw = select(`#sequence-${side}`).value;
  const count = raw.split(/\r?\n/).filter(line => !line.trim().startsWith('>')).join('').replace(/\s/g, '').length;
  select(`#count-${side}`).textContent = `${count} ${count === 1 ? 'base' : 'bases'}`;
  select(`#validation-${side}`).textContent = '';
  select(`#sequence-${side}`).removeAttribute('aria-invalid');
  if (result) {
    select('#result-status').textContent = 'Inputs changed · compare again';
    select('#export-button').disabled = true;
  }
}

function renderAlignment() {
  const columns = [];
  let firstIndex = 0;
  let secondIndex = 0;
  for (const match of result.matches) {
    while (firstIndex < match.first || secondIndex < match.second) {
      columns.push({ first: firstIndex < match.first ? result.first[firstIndex++] : '−', second: secondIndex < match.second ? result.second[secondIndex++] : '−', matched: false });
    }
    columns.push({ first: match.base, second: match.base, matched: true });
    firstIndex++;
    secondIndex++;
  }
  while (firstIndex < result.first.length || secondIndex < result.second.length) {
    columns.push({ first: firstIndex < result.first.length ? result.first[firstIndex++] : '−', second: secondIndex < result.second.length ? result.second[secondIndex++] : '−', matched: false });
  }
  select('#alignment').innerHTML = ['first', 'second'].map((side, index) => `<div class="alignment-row"><span class="alignment-label">Sequence ${index === 0 ? 'A' : 'B'}</span>${columns.map(column => `<span class="aligned-base ${column.matched ? 'matched' : ''} ${column[side] === '−' ? 'gap' : ''}">${column[side]}</span>`).join('')}</div>`).join('');
}

function renderTable() {
  const rowStart = Math.max(0, result.first.length - tableLimit);
  const columnStart = Math.max(0, result.second.length - tableLimit);
  const path = new Map(result.path.map((cell, index) => [`${cell.row},${cell.column}`, { ...cell, index }]));
  let html = '<table class="dp-table" aria-label="LCS prefix lengths"><thead><tr><th scope="col">A / B</th>';
  for (let column = columnStart; column <= result.second.length; column++) html += `<th scope="col" title="Prefix length ${column}">${column === 0 ? '∅' : result.second[column - 1]}</th>`;
  html += '</tr></thead><tbody>';
  for (let row = rowStart; row <= result.first.length; row++) {
    html += `<tr><th scope="row" title="Prefix length ${row}">${row === 0 ? '∅' : result.first[row - 1]}</th>`;
    for (let column = columnStart; column <= result.second.length; column++) {
      const cell = path.get(`${row},${column}`);
      const classes = cell ? `path-cell ${cell.match ? 'match-cell' : ''} ${traceIndex >= 0 && cell.index > traceIndex ? 'future-path' : ''}` : '';
      html += `<td class="${classes}" data-row="${row}" data-column="${column}"><button class="cell-button" aria-label="Row ${row}, column ${column}, LCS length ${result.table[row][column]}">${result.table[row][column]}</button></td>`;
    }
    html += '</tr>';
  }
  select('#dp-table').innerHTML = html + '</tbody></table>';
  select('#table-size').textContent = `${result.first.length + 1} × ${result.second.length + 1} matrix`;
  const cropped = rowStart > 0 || columnStart > 0;
  select('#table-note').textContent = cropped ? `Showing final ${result.first.length - rowStart + 1} × ${result.second.length - columnStart + 1} cells. Export includes the complete table.` : 'Select any cell to understand its value.';
  select('#trace-step').disabled = traceIndex >= result.path.length - 1;
}

function explainCell(row, column) {
  document.querySelectorAll('.selected-cell').forEach(cell => cell.classList.remove('selected-cell'));
  const cell = select(`[data-row="${row}"][data-column="${column}"]`);
  cell?.classList.add('selected-cell');
  let explanation;
  if (row === 0 || column === 0) explanation = `dp[${row}][${column}] = 0. One prefix is empty, so no bases can be shared.`;
  else if (result.first[row - 1] === result.second[column - 1]) explanation = `A[${row}] and B[${column}] both contain ${result.first[row - 1]}. Extend the diagonal answer: ${result.table[row - 1][column - 1]} + 1 = ${result.table[row][column]}.`;
  else explanation = `${result.first[row - 1]} and ${result.second[column - 1]} differ. Keep the best prefix: max(above ${result.table[row - 1][column]}, left ${result.table[row][column - 1]}) = ${result.table[row][column]}.`;
  select('#cell-explanation p').textContent = explanation;
}

function renderResults() {
  select('#similarity').textContent = result.similarity.toFixed(1);
  select('#score-bar').style.width = `${result.similarity}%`;
  select('#lcs-length').textContent = result.length;
  for (const side of ['a', 'b']) {
    const coverage = side === 'a' ? result.coverageFirst : result.coverageSecond;
    select(`#coverage-${side}`).textContent = `${coverage.toFixed(1)}%`;
    select(`#coverage-${side}-bar`).style.width = `${coverage}%`;
  }
  select('#cell-count').textContent = result.cells.toLocaleString();
  select('#matrix-dimensions').textContent = `${result.first.length + 1} × ${result.second.length + 1} matrix, including zero boundaries`;
  select('#runtime-text').textContent = `${result.elapsed.toFixed(2)} ms`;
  select('#lcs-bases').innerHTML = result.length ? [...result.subsequence].map((base, index) => `<span class="base-tile base-${base.toLowerCase()}" title="LCS position ${index + 1}">${base}</span>`).join('') : '<span class="empty-lcs">No common bases found. Try sequences with overlapping bases.</span>';
  select('#matched-description').textContent = `${result.length} shared bases · ${result.length ? 'order preserved in both sequences' : 'no ordered overlap'}`;
  select('#result-status').innerHTML = '<span class="status-dot"></span>Analysis complete';
  select('#export-button').disabled = false;
  select('#copy-button').disabled = !result.length;
  select('#cell-explanation p').textContent = 'Start at the bottom-right and follow the highlighted path back to reconstruct the shared sequence.';
  traceIndex = -1;
  renderAlignment();
  renderTable();
}

function runComparison() {
  const sequences = [];
  let invalid = false;
  for (const side of ['a', 'b']) {
    try {
      sequences.push(normalizeSequence(select(`#sequence-${side}`).value));
      select(`#validation-${side}`).textContent = '';
      select(`#sequence-${side}`).removeAttribute('aria-invalid');
    } catch (error) {
      select(`#validation-${side}`).textContent = error.message;
      select(`#sequence-${side}`).setAttribute('aria-invalid', 'true');
      invalid = true;
    }
  }
  if (invalid) { select('[aria-invalid="true"]').focus(); return; }
  result = compareSequences(...sequences);
  renderResults();
}

function loadExample(name) {
  ['a', 'b'].forEach((side, index) => {
    select(`#sequence-${side}`).value = examples[name][index];
    updateCount(side);
  });
  select('#example-menu').hidden = true;
  runComparison();
}

select('#comparison-form').addEventListener('submit', event => {
  event.preventDefault();
  select('#compare-button').disabled = true;
  select('#compare-button').firstChild.textContent = 'Comparing…';
  requestAnimationFrame(() => setTimeout(() => {
    runComparison();
    select('#compare-button').disabled = false;
    select('#compare-button').firstChild.textContent = 'Compare sequences';
  }, 100));
});
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
document.querySelectorAll('[data-example]').forEach(button => button.addEventListener('click', () => loadExample(button.dataset.example)));
['a', 'b'].forEach(side => select(`#sequence-${side}`).addEventListener('input', () => updateCount(side)));
select('#example-button').addEventListener('click', () => { select('#example-menu').hidden = !select('#example-menu').hidden; });
select('#sidebar-examples').addEventListener('click', () => { setView('comparison'); select('#example-menu').hidden = false; select('#example-button').focus(); });
document.addEventListener('click', event => { if (!event.target.closest('.example-container') && !event.target.closest('#sidebar-examples')) select('#example-menu').hidden = true; });
document.addEventListener('keydown', event => { if (event.key === 'Escape') select('#example-menu').hidden = true; });
select('#swap-button').addEventListener('click', () => {
  const previous = select('#sequence-a').value;
  select('#sequence-a').value = select('#sequence-b').value;
  select('#sequence-b').value = previous;
  ['a', 'b'].forEach(updateCount);
  runComparison();
});
select('#reset-button').addEventListener('click', () => { loadExample('classic'); notify('Default sequences restored'); });
select('#try-example').addEventListener('click', () => { setView('comparison'); loadExample('short'); });
select('#how-it-works').addEventListener('click', () => setView('guide'));
select('#explore-table').addEventListener('click', () => { setView('dp'); window.scrollTo({ top: 0, behavior: 'smooth' }); });
select('#dp-table').addEventListener('click', event => {
  const cell = event.target.closest('td');
  if (cell) explainCell(Number(cell.dataset.row), Number(cell.dataset.column));
});
select('#trace-step').addEventListener('click', () => {
  traceIndex = Math.min(traceIndex + 1, result.path.length - 1);
  renderTable();
  const cell = result.path[traceIndex];
  explainCell(cell.row, cell.column);
  select('.selected-cell')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  select('#table-note').textContent = `Traceback step ${traceIndex + 1} of ${result.path.length}${cell.match ? ` · Keep ${result.first[cell.row - 1]}` : ''}`;
});
select('#trace-reset').addEventListener('click', () => { traceIndex = -1; renderTable(); select('#cell-explanation p').textContent = 'Press Next step to trace back from the final cell.'; });
select('#copy-button').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(result.subsequence); notify('Subsequence copied to clipboard'); }
  catch { notify('Clipboard unavailable. Use Export results to save the subsequence.'); }
});
select('#export-button').addEventListener('click', () => {
  const report = { algorithm: 'Longest Common Subsequence', similarityFormula: '2 * LCS length / (length A + length B) * 100', ...result, exportedAt: new Date().toISOString() };
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'helix-dna-comparison.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify('Comparison report exported');
});
document.querySelectorAll('[data-upload]').forEach(button => button.addEventListener('click', () => { uploadTarget = button.dataset.upload; select('#fasta-file').click(); }));
select('#fasta-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 100000) throw new Error('File is too large. Choose a single DNA record with up to 300 bases.');
    const sequence = normalizeSequence(await file.text());
    select(`#sequence-${uploadTarget}`).value = sequence;
    updateCount(uploadTarget);
    notify(`Sequence ${uploadTarget.toUpperCase()} loaded. Compare to update results.`);
  } catch (error) {
    select(`#validation-${uploadTarget}`).textContent = error.message;
    select(`#sequence-${uploadTarget}`).setAttribute('aria-invalid', 'true');
  }
  event.target.value = '';
});
select('#help-button').addEventListener('click', () => select('#help-dialog').showModal());
select('#close-help').addEventListener('click', () => select('#help-dialog').close());
select('#help-guide').addEventListener('click', () => { select('#help-dialog').close(); setView('guide'); });
select('#help-dialog').addEventListener('click', event => {
  const bounds = event.currentTarget.getBoundingClientRect();
  if (event.target === event.currentTarget && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) event.currentTarget.close();
});
document.querySelectorAll('.page-tab').forEach((tab, index, tabs) => tab.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault();
    const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    next.focus();
    setView(next.dataset.view);
  }
}));
runComparison();
