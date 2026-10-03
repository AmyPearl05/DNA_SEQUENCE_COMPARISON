# Helix · DNA Sequence Comparison

A working educational workspace for comparing DNA strands using longest common subsequence (LCS) and dynamic programming. It includes a responsive HTML/CSS/JavaScript interface and a companion Python/Streamlit application with Biopython FASTA support.

## Netlify application

Netlify publishes `public/` directly; no build step or backend service is required. The deployed interface runs the complete LCS algorithm in the browser, keeping uploaded sequences private. It supports manual input, single-record FASTA uploads, sample pairs, sequence swapping, similarity and coverage metrics, highlighted match alignment, selectable DP cells, step-by-step traceback, and JSON report export.

Use the supplied Netlify development command to preview:

```sh
netlify dev --port 8889
```

## Python / Streamlit companion

Streamlit requires a long-running Python server and does not run inside this static Netlify deployment. The companion provides an independently runnable version of the comparison, FASTA parsing through Biopython, highlighted DP table, traceback decisions, and downloadable reports:

```sh
python -m pip install -r python/requirements.txt
python -m streamlit run python/app.py
```

No remote Python service is silently assumed or required by the deployed web app. Uploaded sequences in the Streamlit companion are processed by the machine running its server.

## Algorithm and limits

Inputs accept A, C, G, and T, case-insensitively, with whitespace removed. Ambiguous bases, multiple FASTA records, and sequences exceeding 300 bases are rejected. LCS preserves base order but permits gaps. A full `(m + 1) × (n + 1)` table stores prefix results; traceback reconstructs one optimal subsequence, preferring upward movement on ties. Time and space complexity are O(m × n).

Similarity is `100 × 2 × LCS length / (length A + length B)`. Coverage is the fraction of each input used in the LCS. These are educational ordered-overlap measures, not biological identity, evolutionary inference, clinical evidence, or a substitution-scored biological alignment.

The web UI displays the final 29 × 29 cells of larger matrices in comparison view and final 61 × 61 in the explorer to keep rendering responsive. The complete table is always computed and included in the export. Runtime measures table computation and reconstruction, not rendering.

## Tests

```sh
npm test
python -m unittest discover -s tests -p 'test_*.py'
```

Algorithm tests cover input normalization, FASTA validation, identical and disjoint inputs, non-contiguous reconstruction, tie-breaking, coverage, and the maximum supported sequence size.
