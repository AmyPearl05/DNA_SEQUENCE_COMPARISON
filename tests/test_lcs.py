import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "python"))
from lcs import compare_sequences, normalize_sequence


class ComparisonTests(unittest.TestCase):
    def test_normalization(self):
        self.assertEqual(normalize_sequence(">sample\nac gt\nac"), "ACGTAC")

    def test_invalid_inputs(self):
        for sequence in ["", "ACGN", "A" * 301, ">a\nAC\n>b\nGT"]:
            with self.assertRaises(ValueError):
                normalize_sequence(sequence)

    def test_identical(self):
        result = compare_sequences("ACGT", "ACGT")
        self.assertEqual(result["subsequence"], "ACGT")
        self.assertEqual(result["similarity"], 100)

    def test_no_overlap(self):
        result = compare_sequences("AAA", "TT")
        self.assertEqual(result["length"], 0)
        self.assertEqual(result["similarity"], 0)

    def test_non_contiguous(self):
        result = compare_sequences("ACGTAC", "AGCTAC")
        self.assertEqual(result["length"], 5)
        self.assertEqual(result["table"][6][6], 5)

    def test_tie_break(self):
        self.assertEqual(compare_sequences("AC", "CA")["subsequence"], "A")


if __name__ == "__main__":
    unittest.main()
