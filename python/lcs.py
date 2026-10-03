"""Longest common subsequence with a recoverable dynamic programming table."""


def normalize_sequence(value):
    lines = value.strip().splitlines()
    if sum(line.strip().startswith(">") for line in lines) > 1:
        raise ValueError("Use one FASTA record per sequence.")
    sequence = "".join(
        line for line in lines if not line.strip().startswith(">")
    )
    sequence = "".join(sequence.split()).upper()
    if not sequence:
        raise ValueError("Enter a DNA sequence.")
    if set(sequence) - set("ACGT"):
        raise ValueError("Use only A, C, G, and T.")
    if len(sequence) > 300:
        raise ValueError("Use up to 300 bases per sequence.")
    return sequence


def compare_sequences(first, second):
    table = [[0] * (len(second) + 1) for _ in range(len(first) + 1)]
    for row in range(1, len(first) + 1):
        for column in range(1, len(second) + 1):
            table[row][column] = (
                table[row - 1][column - 1] + 1
                if first[row - 1] == second[column - 1]
                else max(table[row - 1][column], table[row][column - 1])
            )
    row, column = len(first), len(second)
    matches = []
    path = []
    while row > 0 or column > 0:
        match = row > 0 and column > 0 and first[row - 1] == second[column - 1]
        path.append({"row": row, "column": column, "match": match})
        if match:
            matches.append({"first": row - 1, "second": column - 1, "base": first[row - 1]})
            row -= 1
            column -= 1
        elif row > 0 and (column == 0 or table[row - 1][column] >= table[row][column - 1]):
            row -= 1
        else:
            column -= 1
    path.append({"row": 0, "column": 0, "match": False})
    matches.reverse()
    length = len(matches)
    return {
        "first": first,
        "second": second,
        "table": table,
        "path": path,
        "matches": matches,
        "subsequence": "".join(match["base"] for match in matches),
        "length": length,
        "similarity": 200 * length / (len(first) + len(second)),
        "coverageFirst": 100 * length / len(first),
        "coverageSecond": 100 * length / len(second),
        "cells": (len(first) + 1) * (len(second) + 1),
    }
