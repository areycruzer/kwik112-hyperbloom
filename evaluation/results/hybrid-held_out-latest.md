# Evaluation Report

## Metadata

| Field | Value |
| --- | --- |
| Benchmark version | 1.0.0 |
| Split | held_out |
| Mode | hybrid |
| Evaluated at | 2026-09-12T16:41:29.633Z |
| Provider | glm |
| Model | glm-4.5-flash |
| Commit | c1f9b82 |
| Node version | v26.8.1 |
| Case count | 30 |
| Model attempted | true |

## Primary metrics

| Metric | Value |
| --- | --- |
| Cases | 30 |
| Type accuracy | 0.933 |
| Severity accuracy | 0.767 |
| Critical recall | 1.000 |
| Critical true positives | 9 |
| Critical false negatives | 0 |
| Under-triage | 1 (0.033) |
| Over-triage | 6 (0.200) |
| Location accuracy | 1.000 (25 cases) |
| Threat accuracy | 1.000 (3 cases) |
| Latency p50 (ms) | 17291.260 |
| Latency p95 (ms) | 45003.208 |
| Fallback count | 2 |

## Language slices

| Language | Cases | Type accuracy | Severity accuracy | Critical recall |
| --- | --- | --- | --- | --- |
| en | 14 | 0.857 | 0.714 | 1.000 |
| hi | 6 | 1.000 | 0.667 | 1.000 |
| hinglish | 10 | 1.000 | 0.900 | 1.000 |

## Method counts

| Method | Cases |
| --- | --- |
| glm:glm-4.5-flash | 28 |
| keyword | 2 |

## Exceptions

| Case ID | Exceptions |
| --- | --- |
| held-en-accident-01 | type_mismatch |
| held-en-fire-02 | severity_mismatch |
| held-en-medical-02 | severity_mismatch |
| held-en-accident-02 | severity_mismatch |
| held-en-fire-03 | severity_mismatch |
| held-en-crime-03 | type_mismatch, fallback |
| held-hi-fire-01 | fallback |
| held-hi-crime-01 | severity_mismatch |
| held-hi-civic-02 | severity_mismatch |
| held-hinglish-fire-02 | severity_mismatch |