import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    server: {
        fs: {
            allow: ['..']
        }
    },
    resolve: {
        alias: {
            'node:sqlite': path.resolve(__dirname, 'src/mock-sqlite.ts')
        }
    }
});
