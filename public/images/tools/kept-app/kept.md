---
title: Kept
date: "2026"
tags: [tool, interactive, web]
excerpt: A local-first career garden — my career as a pile of plain-text files.
cover: "jullie-resume-app.png"
---

## What it is

My career history was scattered across résumés, decks, LinkedIn, and files that once handed off were lost. *Kept* collects it in one place: plain markdown files, one bullet per piece of work. Because it's just text, it can be reread, rearranged, and reused either by me, or by a local LLM.

## One garden, many views

The files are the source of truth I can project a dashboard on or just browse through on my computer. My career history becomes a manageable garden I tend, not a document I rewrite. Everything else is a projection of it. A job description is one lens: point it at the garden and a tailored résumé comes out. But an annual review is a lens too. So is an academic CV. So is just sitting with the whole thing and seeing what a decade of work actually adds up to. The career underneath stays what it is; the view changes.

<svg viewBox="0 0 500 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="One garden, many views: the garden projects to a résumé, an annual review, an academic CV, and self-reflection" style="width:27.2em;max-width:100%;height:auto;display:block">
  <title>One garden, many views</title>
  <text x="2" y="90" font-size="18.4" dominant-baseline="middle" fill="currentColor">the garden</text>
  <line x1="106" y1="90" x2="150" y2="90" stroke="currentColor" stroke-width="1"/>
  <line x1="150" y1="30" x2="150" y2="150" stroke="currentColor" stroke-width="1"/>
  <line x1="150" y1="30" x2="178" y2="30" stroke="currentColor" stroke-width="1"/>
  <line x1="150" y1="70" x2="178" y2="70" stroke="currentColor" stroke-width="1"/>
  <line x1="150" y1="110" x2="178" y2="110" stroke="currentColor" stroke-width="1"/>
  <line x1="150" y1="150" x2="178" y2="150" stroke="currentColor" stroke-width="1"/>
  <text x="190" y="30" font-size="18.4" dominant-baseline="middle" fill="currentColor">résumé<tspan font-size="13.6" dx="10">a job description</tspan></text>
  <text x="190" y="70" font-size="18.4" dominant-baseline="middle" fill="currentColor">annual review</text>
  <text x="190" y="110" font-size="18.4" dominant-baseline="middle" fill="currentColor">academic CV</text>
  <text x="190" y="150" font-size="18.4" dominant-baseline="middle" fill="currentColor">self-reflection</text>
</svg>

## How the matching works

Every bullet gets tagged twice. *Tags* are an open vocabulary for the specifics: tools, projects, deliverables. *Signals* are a short closed list of capabilities I maintain by hand where the question isn't "what is this about?" but "what is this evidence of?", and the tagger is allowed to answer *nothing* rather than guess.


<div class="flow">
  <span class="flow-step">what happened</span>
  <span class="flow-arrow">→</span>
  <span class="flow-step">what is it about?</span>
  <span class="flow-arrow">→</span>
  <span class="flow-step">what is it evidence of?</span>
</div>

Paste in a job description and a local model scores every bullet against it: what matches, and what the job asks for that the garden can't yet prove. The gaps turn out to be as useful as the matches.

The whole thing runs on one principle: trust the layer you can read. Plain text, and a vocabulary I can see in full and change.

The engine, the code, and a longer write-up are on [GitHub](https://github.com/RowYourBoats/Kept).
