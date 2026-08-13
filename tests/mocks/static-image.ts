import type { StaticImageData } from 'next/image';

/**
 * Stand-in for statically imported images in the Storybook browser run.
 *
 * `@storybook/nextjs-vite` rewrites a `import logo from '*.png'` into a
 * `virtual:next-image:` module whose generated code drops the backslashes of a
 * Windows path, so `D:\OneEntry\nextjs-fashion-store\…` arrives at Vite as
 * `D:OneEntry<newline>extjs-fashion-storesrc/…` and never resolves. The alias in
 * `vitest.config.ts` points every `.png` import here instead.
 */
const staticImage: StaticImageData = {
  src: '/stub.png',
  width: 160,
  height: 40,
  blurDataURL: '',
  blurWidth: 0,
  blurHeight: 0,
};

export default staticImage;
