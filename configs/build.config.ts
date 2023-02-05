import path from 'node:path'
import * as esbuild from 'esbuild'
import { fileURLToPath } from 'url'
import { promises as fs } from 'fs'
import { getAllFiles } from 'get-all-files'
import { dTSPathAliasPlugin } from 'esbuild-plugin-d-ts-path-alias'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(dirname, `..`)
const srcDir = path.join(rootDir, `src`)
const outdir = path.join(rootDir, `build`)
const esmOut = path.join(outdir, `esm`)
const cjsOut = path.join(outdir, `cjs/index.js`)
const entryFile = path.join(rootDir, `src/index.js`)

const skipFiles = [
  `__mocks__`,
  `__tests__`,
]

const getFiles = async () => {
  // Get all paths to be generated
  const files = await getAllFiles(srcDir)
    .toArray()

  return files.filter(loc => !skipFiles.find(skip => loc.includes(skip)))
}

const cjsBuild = async () => {
  // Build the files with esbuild
  await esbuild.build({
    entryPoints: [entryFile],
    outfile: cjsOut,
    bundle: true,
    minify: true,
    sourcemap: true,
    platform: "node",
    target: ["node16"],
  })
}

const esmBuild = async () => {
  // Build the files with esbuild
  await esbuild.build({
    format: "esm",
    outdir: esmOut,
    bundle: true,
    minify: true,
    sourcemap: true,
    splitting: true,
    target: ["esnext"],
    entryPoints: [entryFile],
    define: { global: "window" },
    plugins: [
      dTSPathAliasPlugin({
        outputPath: esmOut,
        tsconfigPath: path.join(rootDir, 'tsconfig.json'),
      })
    ]
  })
  .catch(() => process.exit(1))
}

const entryFiles = async () => {
  // an entry file for esm at the root of the bundle
  await fs.writeFile(path.join(rootDir, "index.js"), "export * from './build/esm/index.js'")
  // an entry file for cjs at the root of the bundle
  await fs.writeFile(path.join(rootDir, "index.cjs"), "module.exports = require('./build/cjs/index.js')")
}

;(async () => {
  // Remove the existing output dir
  await fs.rm(outdir, { recursive: true, force: true })

  await cjsBuild()
  await esmBuild()
  await entryFiles()
})()

