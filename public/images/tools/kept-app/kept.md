---
title: Kept
date: "2026"
tags: [tool, interactive, web]
excerpt: A local-first career garden — my career as a pile of plain-text files.
cover: "jullie-resume-app.png"
---

## What it is

For years my work history lived scattered across platforms. Effort spent on disposable artifacts, inside walled gardens I couldn't read into.

This project reverses the arrangement. My career is stored as a garden — a pile of short markdown files I tend over time, not a single résumé document.

## How the garden works

<div class="flow">
<span class="flow-step">ingest resume/bullet</span>
<span class="flow-arrow">→</span>
<span class="flow-step">tag</span>
<span class="flow-arrow">→</span>
<span class="flow-step">find signals</span>
<span class="flow-arrow">→</span>
<span class="flow-step">store</span>
</div>

<div class="axis"><span class="axis-label">Tags — an open vocabulary that describes</span> PRIMARY (specific — tools, projects, deliverables) and SECONDARY (broad capability)</div>

The tagger reuses the vocabulary already in the garden, so the tag space stays coherent instead of sprawling. It runs on everything that enters; a retag is deliberate.

<div class="axis"><span class="axis-label">Signals — a closed vocabulary that certifies</span> A fixed capability set (design-systems, brand-system-scale, visual-craft). The prompt asks not "what is this about?" but "what is this credible evidence of?"</div>

0–4 per bullet, fail rather than reach — a missing signal is better than a wrong one. I extend the vocabulary by editing the definitions, not by letting the model invent; one command relabels the corpus against the new list.

## JD matching

The garden can be projected: a job description runs through a local LLM (qwen via Ollama), which scores every bullet against it and reports both the matches and the gaps — what the job asks for that the garden can't yet prove.

<div class="flow">
<span class="flow-step">JD</span>
<span class="flow-arrow">→</span>
<span class="flow-step">analyze</span>
<span class="flow-arrow">→</span>
<span class="flow-step">match</span>
<span class="flow-arrow">→</span>
<span class="flow-step">export + gaps</span>
</div>

I measured each scoring layer against bullets I'd marked by hand:

<div class="axis"><span class="axis-label">keyword overlap</span> — literal words a bullet shares with the job <span class="axis-weight">carried the selection</span></div>
<div class="axis"><span class="axis-label">capability signals</span> — the closed vocabulary; evidence, not aboutness <span class="axis-weight">carried the selection</span></div>
<div class="axis"><span class="axis-label">breadth of coverage</span> — how many of the job's needs one bullet meets <span class="axis-weight">a smaller nudge</span></div>
<div class="axis"><span class="axis-label off"><s>embeddings</s></span> — matching on meaning rather than words <span class="axis-weight off"><s>dropped from the ranking — nothing moved</s></span></div>

The principle the whole thing runs on: trust the layer you can read. Words that match, and a vocabulary I can see in full and change, carry the load.

The engine, the code, and a longer write-up are on [GitHub](https://github.com/RowYourBoats/Jullie).
