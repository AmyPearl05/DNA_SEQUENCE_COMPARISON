export function normalizeSequence(value) {
  const lines = value.trim().split(/\r?\n/);
  const headers = lines.filter(line => line.trim().startsWith('>'));
  if (headers.length > 1) throw new Error('Upload one FASTA record per sequence.');
  const sequence = lines.filter(line => !line.trim().startsWith('>')).join('').replace(/\s/g, '').toUpperCase();
  if (!sequence) throw new Error('Enter a DNA sequence to continue.');
  if (!/^[ACGT]+$/.test(sequence)) throw new Error('Use only A, C, G and T. Spaces and FASTA headers are supported.');
  if (sequence.length > 300) throw new Error('Use up to 300 bases per sequence for this interactive prototype.');
  return sequence;
}

export function compareSequences(first, second) {
  const started = performance.now();
  const table = Array.from({ length: first.length + 1 }, () => Array(second.length + 1).fill(0));
  for (let row = 1; row <= first.length; row++) {
    for (let column = 1; column <= second.length; column++) {
      table[row][column] = first[row - 1] === second[column - 1]
        ? table[row - 1][column - 1] + 1
        : Math.max(table[row - 1][column], table[row][column - 1]);
    }
  }
  let row = first.length;
  let column = second.length;
  const path = [];
  const matches = [];
  while (row > 0 || column > 0) {
    const match = row > 0 && column > 0 && first[row - 1] === second[column - 1];
    path.push({ row, column, match });
    if (match) {
      matches.push({ first: row - 1, second: column - 1, base: first[row - 1] });
      row--;
      column--;
    } else if (row > 0 && (column === 0 || table[row - 1][column] >= table[row][column - 1])) {
      row--;
    } else {
      column--;
    }
  }
  path.push({ row: 0, column: 0, match: false });
  matches.reverse();
  const length = matches.length;
  return {
    first, second, table, path, matches,
    subsequence: matches.map(match => match.base).join(''), length,
    similarity: 2 * length / (first.length + second.length) * 100,
    coverageFirst: length / first.length * 100,
    coverageSecond: length / second.length * 100,
    elapsed: performance.now() - started,
    cells: (first.length + 1) * (second.length + 1)
  };
}
