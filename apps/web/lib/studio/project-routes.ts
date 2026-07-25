export const studioProjectSections = [
  'overview',
  'blueprint',
  'screenplay',
  'chapters',
  'review',
  'facts',
  'versions',
  'adaptation',
] as const;

export type StudioProjectSection = (typeof studioProjectSections)[number];
