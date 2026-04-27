import { defineConfig } from "tsup";
import { Plugin } from 'esbuild';
import fs from 'fs';

const wgslPlugin: Plugin = {
  name: 'wgsl',
  setup(build) {
    build.onLoad({ filter: /\.wgsl$/ }, (args) => {
      let source = fs.readFileSync(args.path, 'utf8');

      source = source
        .replace(/\/\/[^\n]*/g, '')       // strip // comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // strip /* */ comments
				.replace(/[^\x00-\x7F]/g, '')  		// strip non-ASCII
        .replace(/\s+/g, ' ')             // collapse whitespace
        .trim();

      return {
        contents: `export default ${JSON.stringify(source)}`,
        loader: 'js',
      };
    });
  },
};

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
	esbuildPlugins: [wgslPlugin],
	loader: {
    '.wgsl': 'text',
    '.glsl': 'text',
  },
  outExtension() {
    return { js: ".mjs" };
  },
});