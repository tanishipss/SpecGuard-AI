# gold_sections review

For each question, retrieval was run through the real pipeline (dense+sparse+RRF+reranking) against the live corpus. Top-3 candidates shown with rerank scores. **My proposed pick is bolded** — usually the top-1, except where I judged a second section genuinely necessary to fully answer (marked with a note). Nothing has been written to `dataset.json` yet.

Please mark any row where my pick is wrong, or where you want additional/different sections included.

## Factual (q001–q010)

| ID | Question | Candidates (spec#section · score) | Proposed `gold_sections` |
|---|---|---|---|
| q001 | Primary function of the AMF | **23.502#4.2.1** (6.28); 23.501#4.2.2 (6.15); 23.503#6.2.8 (6.11) | `["23.502#4.2.1"]` |
| q002 | SMF acronym + role in PDU session | 23.502#5.2.8.2.9 (3.96); 23.501#5.15.5.3 (3.93); 23.501#5.34.3 (3.74) | ⚠️ low confidence — see note |
| q003 | What is a PDU Session | **23.501#5.6.9.1** (7.35); 23.501#5.6.13 (5.63); 23.501#5.27.0 (5.38) | `["23.501#5.6.9.1"]` |
| q004 | Purpose of 5QI | **23.501#5.7.4** (5.52); 23.501#5.7.3.1 (5.04); 23.501#5.9.1 (4.79) | `["23.501#5.7.4"]` |
| q005 | Network slicing | **23.501#4.1** (4.15); 23.501#4.2.2 (3.42); 23.501#5.15.8 (3.23) | ⚠️ low confidence — see note |
| q006 | Role of UPF | **23.501#6.2.3** (5.32); 23.501#5.8.1 (4.86); 23.501#5.8.2.14 (4.36) | `["23.501#6.2.3"]` |
| q007 | N2 reference point | 23.501#4.2.8.3.1 (3.95); 23.501#4.4.2.2 (3.73); 23.501#4.2.8.5.4 (3.72) | ⚠️ low confidence — see note |
| q008 | UDM responsibilities | **23.501#6.2.7** (6.72); 23.501#6.2.11 (5.89); 23.503#6.2.4 (2.58) | `["23.501#6.2.7"]` |
| q009 | PCF responsibilities | **23.503#6.1.3.1** (8.68); 23.503#5.2.1 (6.81); 23.501#4.2.2 (5.45) | `["23.503#6.1.3.1"]` |
| q010 | S-NSSAI | 23.501#5.15.2.1 (5.08); 23.501#5.19.7.4 (4.14); 23.502#5.2.3.3.1 (3.86) | ⚠️ low confidence — see note |

## Procedural (q011–q020)

| ID | Question | Candidates (spec#section · score) | Proposed `gold_sections` |
|---|---|---|---|
| q011 | UE registration steps | **23.502#4.11.1.3.3** (4.47); 23.502#4.23.13.3 (4.45); 23.502#4.11.2.3 (4.39) | ⚠️ low confidence — see note |
| q012 | PDU session establishment (UE/AMF/SMF) | **23.502#4.4.1.2** (7.75); 23.502#4.9.2.4.1 (7.14); 23.502#4.22.2.2.1 (7.04) | `["23.502#4.4.1.2"]` |
| q013 | Xn-based inter-gNB handover | 23.502#4.23.12.8.6 (4.77); 23.502#4.2.7.2.2 (4.28); 23.502#4.9.1.2.1 (4.24) | ⚠️ low confidence — see note |
| q014 | QoS flow binding during PDU establishment | **23.503#6.1.3.2.4** (8.09); 23.501#5.7.1.4 (6.10); 23.502#4.11.1.1 (5.87) | `["23.503#6.1.3.2.4"]` |
| q015 | AMF re-allocation during initial registration | **23.502#4.2.2.2.3** (8.37); 23.502#4.16.1.1 (7.06); 23.502#4.11.1.3.4 (6.37) | `["23.502#4.2.2.2.3"]` |
| q016 | Service request for idle-mode UE | **23.502#4.2.3.1** (7.25); 23.502#4.2.3.2 (7.15); 23.501#5.3.3.2.2 (6.48) | `["23.502#4.2.3.1", "23.502#4.2.3.2"]` (adjacent, likely both relevant) |
| q017 | UE-triggered PDU session release | 23.502#3 (6.71 — looks like a TOC/definitions hit, suspicious); 23.502#4.3.2.2.2 (6.44); 23.502#4.3.4.3 (6.43) | ⚠️ low confidence — see note |
| q018 | SMF selects UPF | **23.502#4.23.2** (8.16); 23.501#6.3.3.1 (7.86); 23.501#5.16.3.11 (7.35) | `["23.502#4.23.2", "23.501#6.3.3.1"]` |
| q019 | Network-initiated deregistration | **23.502#4.2.2.3.1** (7.78); 23.502#4.2.2.3.3 (7.11); 23.502#4.12.3 (6.36) | `["23.502#4.2.2.3.1"]` |
| q020 | AMF paging for CM-IDLE UE | **23.501#5.4.3.1** (7.82); 23.502#4.2.3.2 (7.60); 23.502#4.2.3.3 (7.45) | `["23.501#5.4.3.1"]` |

## Comparison (q021–q025)

| ID | Question | Candidates (spec#section · score) | Proposed `gold_sections` |
|---|---|---|---|
| q021 | AMF vs SMF difference | 23.502#4.23.7.2.2 (5.51); 23.502#4.23.7.2.3 (4.87); 23.501#5.6.2 (3.86) | ⚠️ low confidence — comparisons span q001+q002's sections rather than one new hit |
| q022 | PDU session vs QoS flow | 23.501#5.32.4 (6.82); 23.501#5.31.19 (4.80); 23.501#5.7.1.1 (4.79) | ⚠️ low confidence — see note |
| q023 | Non-roaming vs home-routed roaming | **23.501#4.2.8.1** (4.64); 23.501#4.3.3.2 (4.64); 23.501#4.2.8.2.1 (4.32) | `["23.501#4.2.8.1", "23.501#4.3.3.2"]` |
| q024 | CM-IDLE vs CM-CONNECTED | **23.501#5.3.3.2.1** (7.82); 23.501#5.3.3.4 (5.30); 23.501#5.3.3.2.3 (4.00) | `["23.501#5.3.3.2.1"]` |
| q025 | 5G flow-based QoS vs EPS bearer-based | 23.501#5.7.1.1 (5.96); 23.501#5.22.1 (4.69); 23.501#5.32.4 (4.17) | ⚠️ low confidence — likely needs a 4G/EPS comparison clause not well captured by this corpus (only 23.501/502/503 ingested, EPS detail may live elsewhere) |

## Multi-hop (q026–q030)

| ID | Question | Candidates (spec#section · score) | Proposed `gold_sections` |
|---|---|---|---|
| q026 | 5QI → QoS flow → UPF enforcement | **23.503#6.2.2.1** (5.69); 23.503#6.1.3.6 (4.78); 23.501#5.7.2.7 (3.82) | `["23.503#6.2.2.1", "23.503#6.1.3.6"]` |
| q027 | New AMF → effect on SMF/UPF-anchored sessions | 23.501#5.34.7.1 (5.44); 23.502#4.9.1.2.2 (5.26 — appears twice, likely dup) | ⚠️ low confidence — see note |
| q028 | PCC rules → QoS enforcement at UPF | **23.503#6.2.2.1** (5.34); 23.503#6.3.2 (4.02); 23.503#6.2.1.1.1 (3.80) | `["23.503#6.2.2.1", "23.503#6.3.2"]` |
| q029 | S-NSSAI slice selection → AMF/SMF selection | 23.501#5.15.5.3 (5.72); 23.501#5.15.12.2 (5.21); 23.502#4.3.2.2.3.2 (5.03) | ⚠️ low confidence — see note |
| q030 | SSC mode → UPF reallocation | **23.501#5.6.9.2.1** (6.34); 23.502#4.3.5.3 (5.44); 23.501#5.6.9.1 (5.43) | `["23.501#5.6.9.2.1", "23.501#5.6.9.1"]` |

## Flagged as low-confidence (12 questions — need your judgment, not mine)

q002, q005, q007, q010, q011, q013, q017, q021, q022, q025, q027, q029 — the reranker's top hit didn't clearly stand out (scores close together, or the hit looks like a definitions/TOC section rather than substantive content), or the question is a comparison/multi-hop question where a single retrieved chunk doesn't obviously constitute "the" answer. I did not propose a pick for these — they need either your direct read of the source PDF, or a note that this question's correct answer may span sections not well-isolated by retrieval alone.

## Out-of-scope + adversarial (q031–q045)

All 15 get `"gold_sections": []` — no chunk should correctly answer these by design, so this is not a judgment call.
