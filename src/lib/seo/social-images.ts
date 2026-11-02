// Nested metadata such as `openGraph` is shallowly merged across segments, so a page that sets its own
// `openGraph` / `twitter` drops the root `opengraph-image`. Pages spread these images back in explicitly.
export const DEFAULT_SOCIAL_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Pagepod - Free HTML hosting",
};

export const defaultOpenGraphImages = { images: [DEFAULT_SOCIAL_IMAGE] };
export const defaultTwitterImages = { images: [DEFAULT_SOCIAL_IMAGE.url] };
