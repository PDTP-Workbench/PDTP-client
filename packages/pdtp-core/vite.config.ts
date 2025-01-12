import { defineConfig } from "vite";

export default defineConfig({
	build: {
		lib: {
			entry: "src/index.ts",
			formats: ["es", "cjs"],
			fileName: "index",
		},
	},
	resolve: {
		preserveSymlinks: true,
	},
	plugins: [],
});
