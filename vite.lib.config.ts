import {defineConfig} from 'vite';
import {externalizeDeps} from 'vite-plugin-externalize-deps';
import dts from 'vite-plugin-dts';
import ts from 'typescript';

// Emitted .d.ts keep extensionless sibling specifiers, which node16 consumers reject.
const withSiblingExtensions = (extension: 'js' | 'cjs') => (content: string) =>
  content.replace(
    /^(im|ex)port\s[\w{}*\s,]+from\s['"]\.\/[^.'"]+(?=['"];?$)/gm,
    `$&.${extension}`
  );

const declarations = (srcDir: string, format: 'esm' | 'cjs') =>
  dts({
    outDir: `dist/${format}`,
    entryRoot: srcDir,
    include: srcDir,
    compilerOptions: {
      module: format === 'esm' ? ts.ModuleKind.ESNext : ts.ModuleKind.CommonJS,
      declarationMap: false,
    },
    beforeWriteFile: (filePath, content) => ({
      filePath:
        format === 'cjs' ? filePath.replace('.d.ts', '.d.cts') : filePath,
      content: withSiblingExtensions(format === 'esm' ? 'js' : 'cjs')(content),
    }),
  });

export const libBuildConfig = ({
  entry,
  srcDir,
}: {
  entry: string;
  srcDir: string;
}) =>
  defineConfig({
    plugins: [
      externalizeDeps(),
      declarations(srcDir, 'esm'),
      declarations(srcDir, 'cjs'),
    ],
    build: {
      outDir: 'dist',
      minify: false,
      sourcemap: true,
      lib: {
        entry,
        formats: ['es', 'cjs'],
        fileName: format =>
          format === 'cjs' ? 'cjs/[name].cjs' : 'esm/[name].js',
      },
      rollupOptions: {output: {preserveModules: true}},
    },
  });
