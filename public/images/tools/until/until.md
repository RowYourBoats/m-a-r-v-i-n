---
title: Until
date: "2026"
tags: [tool, interactive, web]
excerpt: A simple task tracker, scratchpad, and project organizer organized by horizons instead of calendars.
cover: "until-macbook.png"
order:
  - until-macbook.png
  - until-mobile.png
---

Until is a local-first task and project tracker.

Time isn't experienced as a grid. Things come over the horizon, alongside the loose tasks of the day and the practices I intend to keep up.

## What it is

Until is a task tracker, scratchpad, and project organizer. Instead of a calendar, it sorts everything by how many days are left: the near things stay visible, the far things fold away into horizons. Each horizon is also a real folder on disk, so the tracker and the working files are the same structure.

## The folder is the project

Creating a horizon creates a folder; the Blender files, PDFs, and drafts for that project live in it. Rename the horizon and the folder renames. Complete it, and the folder moves to the archive. Even deleting is a move, into trash, so nothing vanishes. The tracker can't drift from the actual work because they're the same thing.

## The record

Underneath the surfaces, Until keeps one record: what I did. The tool is built to make honesty cheap. Not every unfinished thing is a failure — some I set down on purpose, and the difference is kept. A wrecked day gets named as force majeure: sick, traveling, no electricity. And the record is mine, in flat JSON files and real folders on disk.

## How projects are organized

<div class="axis"><span class="axis-label">Over The Horizon</span> overdue <span class="axis-weight">always visible</span></div>
<div class="axis"><span class="axis-label">Short Horizon</span> 0–15 days <span class="axis-weight">always visible</span></div>
<div class="axis"><span class="axis-label">Horizon</span> 16–180 days <span class="axis-weight">folds away</span></div>
<div class="axis"><span class="axis-label">Long Horizon</span> 180+ days <span class="axis-weight">folds away</span></div>
<div class="axis"><span class="axis-label">Watching</span> recurring events with a tentative date <span class="axis-weight">folds away</span></div>

## Other ways of writing to the record

Every surface is a ritual for writing to it, none of them mandatory, each one honest about what happened.

<div class="axis"><span class="axis-label">The scratchpad</span> Yesterday, today, tomorrow. Type and enter to add, tap to complete. What's left unchecked carries forward: the original stays as a dimmed record of what moved, and a fresh copy lands on today.</div>
<div class="axis"><span class="axis-label">Repeating</span> ractices can't be failed, only skipped or kept. Tap to engage; a 2.5-second undo window absorbs a fat-finger tap before anything is written.</div>
<div class="axis"><span class="axis-label">Pomodoro</span> 35 minutes tied to one task, ending in a true outcome: completed, fresh (distracted — the partial gets logged), postponed, or aborted (under a minute; kept out of the stats).</div>
<div class="axis"><span class="axis-label">Gardening</span> I can walk every active horizon — read it, update its next action, tend its todos, save or skip. Work that hasn't been visited in two weeks is marked. Projects don't fail silently in a corner.</div>

## How

The main app is local-first: it runs in the browser, in flat JSON files, with no database and no account. A small update put the same app on my phone, and one small file on Drive syncs the two, turn-based, on click.

The code and a longer write-up are on GitHub. 

[GitHub](https://github.com/RowYourBoats/Until)