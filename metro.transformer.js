const { getDefaultConfig } = require('expo/metro-config');
const { transform } = require('@svgr/core');

const defaultConfig = getDefaultConfig(__dirname);
const upstreamTransformer = require(defaultConfig.transformer.babelTransformerPath);

module.exports.transform = async ({ src, filename, options }) => {
  if (filename.endsWith('.svg')) {
    // Remove XML declaration and any leading whitespace/content before <svg>
    let svgContent = src.toString();

    console.log(`[SVG TRANSFORMER] Processing: ${filename}`);
    console.log(`[SVG TRANSFORMER] Original first 150 chars: ${svgContent.substring(0, 150)}`);

    // Remove XML declaration
    svgContent = svgContent.replace(/<\?xml[^?]*\?>\s*/g, '');
    // Remove any DOCTYPE declarations
    svgContent = svgContent.replace(/<!DOCTYPE[^>]*>\s*/gi, '');
    // Remove any comments before the svg tag
    svgContent = svgContent.replace(/<!--[\s\S]*?-->\s*/g, '');
    // Ensure we start with <svg
    svgContent = svgContent.replace(/^[^<]*(<svg)/i, '$1');
    svgContent = svgContent.trim();

    console.log(`[SVG TRANSFORMER] Cleaned first 150 chars: ${svgContent.substring(0, 150)}`);

    const jsCode = await transform(
      svgContent,
      {
        native: true,
        plugins: ['@svgr/plugin-jsx'], // Removed SVGO plugin - it might be reading the file directly
      },
      { filePath: filename }
    );

    return upstreamTransformer.transform({
      src: jsCode,
      filename,
      options,
    });
  }

  return upstreamTransformer.transform({ src, filename, options });
};
