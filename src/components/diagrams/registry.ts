// Diagram registry: maps a diagram slug to its client-side mount function.
//
// A `::diagram[slug]` fence in a markdown project doc (and the slim
// Connectivity.astro shell) renders an empty `<div class="diagram-mount"
// data-diagram="slug">`. mountAll() finds those placeholders and builds the
// matching animated diagram into each — one shared bootstrap for both the
// standalone /diagrams/[slug] page and inline-in-doc embeds.
//
// To add a diagram: create `<slug>.client.ts` exporting a mount(root) function
// and add one line here.
import { mountConnectivity } from "./connectivity.client";

export const diagrams: Record<string, (root: HTMLElement) => void> = {
  connectivity: mountConnectivity,
};

/** Mount every not-yet-mounted [data-diagram] placeholder under `scope`. */
export function mountAll(scope: ParentNode = document): void {
  scope.querySelectorAll<HTMLElement>("[data-diagram]").forEach((el) => {
    if (el.dataset.mounted) return;
    const mount = diagrams[el.dataset.diagram ?? ""];
    if (!mount) return;
    el.dataset.mounted = "true";
    mount(el);
  });
}
