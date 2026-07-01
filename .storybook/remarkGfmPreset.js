/** Local Storybook preset — adds remark-gfm to MDX compiler (enables pipe tables). */
module.exports = {
  async mdxLoaderOptions(options) {
    const { default: remarkGfm } = await import('remark-gfm');
    return {
      ...options,
      mdxCompileOptions: {
        ...options?.mdxCompileOptions,
        remarkPlugins: [
          ...(options?.mdxCompileOptions?.remarkPlugins ?? []),
          remarkGfm,
        ],
      },
    };
  },
};
