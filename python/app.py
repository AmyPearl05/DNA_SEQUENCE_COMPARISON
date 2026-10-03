import json
from io import StringIO

import pandas as pd
import streamlit as st
from Bio import SeqIO
from Bio.Seq import Seq

from lcs import compare_sequences, normalize_sequence


st.set_page_config(page_title="Helix · DNA comparison", layout="wide")
st.title("Helix · DNA Sequence Comparison")
st.caption("Find a longest common subsequence and explore its dynamic programming table.")


def sequence_input(label, default):
    uploaded = st.file_uploader(f"Upload {label} FASTA", type=["fasta", "fa", "fna", "txt"])
    if uploaded is not None:
        try:
            text = uploaded.getvalue().decode("utf-8")
            if text.lstrip().startswith(">"):
                records = list(SeqIO.parse(StringIO(text), "fasta"))
                if len(records) != 1:
                    raise ValueError("Upload exactly one FASTA record.")
                default = str(records[0].seq)
            else:
                default = text
        except (UnicodeDecodeError, ValueError) as error:
            st.error(str(error))
    return st.text_area(label, default, height=110, key=f"{label}-{default}")


left, right = st.columns(2)
with left:
    first_input = sequence_input("Sequence A", "ATGCTAGCTAGCATCG")
with right:
    second_input = sequence_input("Sequence B", "ATGCGATCTAGCTACG")

if st.button("Compare sequences", type="primary"):
    try:
        first = str(Seq(normalize_sequence(first_input)))
        second = str(Seq(normalize_sequence(second_input)))
        result = compare_sequences(first, second)
        score, length, cells = st.columns(3)
        score.metric("LCS similarity", f"{result['similarity']:.1f}%")
        length.metric("LCS length", f"{result['length']} bases")
        cells.metric("DP cells", result["cells"])
        st.subheader("Longest common subsequence")
        st.code(result["subsequence"] or "No common bases", language=None)
        st.write(f"Coverage A: {result['coverageFirst']:.1f}% · Coverage B: {result['coverageSecond']:.1f}%")
        st.subheader("Dynamic programming table")
        frame = pd.DataFrame(
            result["table"],
            index=["0: ∅"] + [f"{index}: {base}" for index, base in enumerate(first, 1)],
            columns=["0: ∅"] + [f"{index}: {base}" for index, base in enumerate(second, 1)],
        )
        path = {(cell["row"], cell["column"]): cell for cell in result["path"]}

        def highlight_path(data):
            styles = pd.DataFrame("", index=data.index, columns=data.columns)
            for (row, column), cell in path.items():
                styles.iloc[row, column] = "background-color: " + ("#b9d5a5" if cell["match"] else "#e9f1e1")
            return styles

        st.dataframe(frame.style.apply(highlight_path, axis=None), height=450)
        st.caption("Green cells show the traceback; darker cells are matching bases.")
        st.subheader("Reconstruction decisions")
        st.dataframe(pd.DataFrame(result["path"]), hide_index=True)
        st.download_button("Download full report", json.dumps(result, indent=2), "helix-comparison.json", "application/json")
    except ValueError as error:
        st.error(str(error))

with st.expander("How the algorithm works", expanded=True):
    st.markdown("""
    Each cell `dp[i][j]` stores the LCS length of the first `i` bases of A and first `j` bases of B.

    - **Empty prefix:** `dp[0][j] = dp[i][0] = 0`.
    - **Matching bases:** `dp[i][j] = dp[i-1][j-1] + 1`.
    - **Different bases:** `dp[i][j] = max(dp[i-1][j], dp[i][j-1])`.
    - **Traceback:** start at the bottom-right; keep diagonal matches and move toward the larger prefix answer otherwise. Ties move upward.

    Time and space are **O(m × n)**. Multiple optimal subsequences can exist.
    Similarity is **2 × LCS length / (length A + length B)**, not biological identity or clinical evidence.
    """)
