// Shared media ordering for project pages and essays so the two stay
// consistent. An explicit `order` list (filenames for images, titles for
// videos) comes first, in listed order; everything else falls through to
// alphabetical by the same key. Zero-padded numeric filename prefixes
// (00-, 01- … 11-) therefore sort into their intended order for free.

/** The sort key for an item: video title, else decoded image filename. */
export function orderKey(item: any): string {
  return item.type === "video"
    ? item.title || ""
    : decodeURIComponent((item.src || "").split("/").pop() || "");
}

/** Returns a new array ordered by `order` first, then alphabetically by key. */
export function orderItems<T>(items: T[], order: string[] = []): T[] {
  const orderIndex = new Map(order.map((f, i) => [f, i]));
  return [...items].sort((a, b) => {
    const ak = orderKey(a);
    const bk = orderKey(b);
    const ai = orderIndex.get(ak);
    const bi = orderIndex.get(bk);
    if (ai !== undefined && bi !== undefined) return ai - bi;
    if (ai !== undefined) return -1;
    if (bi !== undefined) return 1;
    return ak.localeCompare(bk);
  });
}
