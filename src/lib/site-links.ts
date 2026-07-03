// The footer link list, shared with any page that wants the same contacts
// inline (the landing page renders them as a `contact` section). Edit here
// and both places update.
export interface SiteLink {
  href: string;
  label: string;
  external?: boolean;
}

export const SITE_LINKS: SiteLink[] = [
  { href: "/resume", label: "Résumé" },
  { href: "mailto:marvin@m-a-r-v-i-n.com", label: "mail: marvin@m-a-r-v-i-n.com" },
  { href: "https://github.com/RowYourBoats", label: "Github: @RowYourBoats", external: true },
  { href: "https://www.instagram.com/specifically_marvin/", label: "Instagram: @specifically_marvin", external: true },
  { href: "https://www.linkedin.com/in/marvin-de-jong/", label: "LinkedIn: marvin-de-jong", external: true },
];
