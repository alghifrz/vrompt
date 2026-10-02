export const LANDING_HEADER_OFFSET = 104;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function scrollToLandingSection(href: string) {
  const id = href.startsWith("#") ? href.slice(1) : href;
  const element = document.getElementById(id);
  if (!element) {
    return false;
  }

  const top = Math.max(
    0,
    element.getBoundingClientRect().top + window.scrollY - LANDING_HEADER_OFFSET,
  );
  window.scrollTo({
    top,
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
  window.history.replaceState(null, "", `#${id}`);
  return true;
}
