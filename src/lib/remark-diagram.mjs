// Remark plugin: turn a fenced ```diagram block into a diagram mount point.
//
// Authoring (in a markdown project doc body):
//
//     ```diagram
//     connectivity
//     ```
//
// The fence body is the diagram slug. We replace the `code` node with a raw
// `<div class="diagram-mount" data-diagram="slug">` placeholder; the diagram
// registry (src/components/diagrams/registry.ts) mounts the animated SVG into
// it client-side. Running at the remark (mdast) stage means the fence never
// reaches the syntax highlighter, and every other code fence is left untouched.

function visit(node, type, fn) {
  if (!node || !node.children) return;
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child.type === type) fn(child, i, node);
    else visit(child, type, fn);
  }
}

export default function remarkDiagram() {
  return (tree) => {
    visit(tree, "code", (node, index, parent) => {
      if (node.lang !== "diagram") return;
      const slug = (node.value || "").trim().split(/\s+/)[0] || "";
      parent.children[index] = {
        type: "html",
        value: `<div class="diagram-mount" data-diagram="${slug}"></div>`,
      };
    });
  };
}
