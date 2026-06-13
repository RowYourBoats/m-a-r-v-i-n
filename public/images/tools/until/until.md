---
title: Until
date: "2026"
tags: [tool, interactive, web]
excerpt: A simple task tracker, scratchpad, and project organizer organized by horizons instead of calendars.
cover: "until.png"
---

Time isn't experienced as a grid. Things come over the horizon alongside the loose tasks of the day and the practices I intend to keep up.

## What it is

Until is a task tracker, scratchpad, and project organizer. It organizes tasks by how many days are left. The near ones visible, the far ones categorized in horizon, long horizon, watching (recurring events with a tentative date), and an over the horizon for those that got pushed out too far. A daily surface of loose tasks and repeating practices is what's used to keep track of my daily tasks. Then a small pomodoro tracker at the top helps with pushing through the tasks that linger. Time isn't experienced as a grid. Things come over the horizon alongside the loose tasks of the day and the practices I intend to keep up.

A dummy project is on vercel. The code and a longer write-up are on GitHub. 

[Vercel](https://until-ashy.vercel.app/) <span class="axis-weight">resize the window to match the white canvas</span>  
[GitHub](https://github.com/RowYourBoats/Jullie)

## Scratchpad

Yesterday, today, tomorrow — a scratchpad of loose tasks. Type and enter to add, tap to complete, link a task to the horizon it belongs to. Whatever I leave unchecked at day's end can be carried forward, so undone work follows me instead of vanishing.

Repeating. Recurring practices can't be failed, only skipped or kept. Tap to engage. A short undo window absorbs a fat-finger tap before it's written, so the record stays honest instead of cluttered.

## How projects are organized

<div class="axis"><span class="axis-label">Over The Horizon</span> — overdue <span class="axis-weight">always visible</span></div>
<div class="axis"><span class="axis-label">Short Horizon</span> — 0–15 days <span class="axis-weight">always visible</span></div>
<div class="axis"><span class="axis-label">Horizon</span> — 16–180 days <span class="axis-weight">folds away</span></div>
<div class="axis"><span class="axis-label">Long Horizon</span> — 180+ days <span class="axis-weight">folds away</span></div>
<div class="axis"><span class="axis-label">Watching</span> — recurring events with a tentative date <span class="axis-weight">folds away</span></div>



## Pomodoro

A 35-minute timer tied to one task — a tracker to force focus on a single thing, not a clock that runs all day.

<div class="flow">
<span class="flow-step">pick a task</span>
<span class="flow-arrow">→</span>
<span class="flow-step">35 min</span>
<span class="flow-arrow">→</span>
<span class="flow-step">honest outcome</span>
</div>

Each session ends with a true outcome, including the ones that admit failure:

<div class="axis"><span class="axis-label">completed</span> — full session; marks the task done</div>
<div class="axis"><span class="axis-label">fresh</span> — distracted; logs the partial and resets</div>
<div class="axis"><span class="axis-label">postponed</span> — paused, nothing logged</div>
<div class="axis"><span class="axis-label">force majeure</span> — a day named as disrupted, not silently missed</div>
<div class="axis"><span class="axis-label">aborted</span> — under 60 seconds; auto-applied, keeps stray taps out of the stats</div>

Repeating is a daily choice, not a schedule I'm failing against; a session ends with what actually happened; a wrecked day gets named rather than hidden; undone work carries forward instead of disappearing.

A true record beats a flattering one, including an honest record of what didn't happen. Not every unfinished thing is a failure. Some I set down on purpose, and the difference is worth keeping. Repeating is a daily choice, not a schedule I'm failing against. A session ends with what actually happened. A wrecked day gets named rather than hidden, and undone work carries forward instead of disappearing. The tool tracks what I did, not what I meant to. And that's data and a taxonomy I own instead of a graph somewhere in a company owned tool.

Local-first: runs in the browser, but needs no internet and talks to none. Flat JSON files, no database, no account.