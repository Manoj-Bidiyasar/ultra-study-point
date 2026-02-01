export function buildBreadcrumbs({ type, currentLabel }) {
  return [
    ...type.base,
    { label: currentLabel, href: null },
  ];
}
