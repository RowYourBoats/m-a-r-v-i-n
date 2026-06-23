---
title: Kept
date: "2026"
tags: [tool, interactive, web]
excerpt: A local-first career garden — my career as a pile of plain-text files.
cover: "jullie-resume-app.png"
---

## What it is

Over the years my work history has become scattered and often suffered from being locked behind a walled garden during a hand-off. 

This project is an attempt to undo some of that damage, storing my career hisotry as a series of bulleted markdown files. Instead of keeping track of it across multiple platforms everything is reduced to a simple markdown file that can be reused, rearranged, reingested, etc. Turning one off efforts into a sustainable project. Either by myself or a local LLM.

Right now the system, from now on called a career garden, is set up to work like this:

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

The tagger reuses the vocabulary already in the garden, so the tag space stays coherent instead of sprawling.

<div class="axis"><span class="axis-label">Signals — a closed vocabulary that certifies</span> A fixed capability set (design-systems, brand-system-scale, visual-craft). The prompt asks not "what is this about?" but "what is this evidence of?"</div>

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

The principle the whole thing runs on: trust the layer you can read. Words that match, and a vocabulary I can see in full and change.

The engine, the code, and a longer write-up are on [GitHub](https://github.com/RowYourBoats/Kept).
