module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Remove console.log in production builds only
      process.env.NODE_ENV === 'production' && 'transform-remove-console',
    ].filter(Boolean),
  };
};
