#!/usr/bin/env node
/** Emit frame-tree JSON DTO from YAML (TS loader). No layout. */
import { readFileSync } from 'node:fs';
import { distImport, resolveFrameYamlPath } from './_dist-import.mjs';

const yamlPath = resolveFrameYamlPath(process.argv[2], process.argv);
const { loadFrameYaml } = await distImport('frame-yaml-loader.js');
const { serializeFrameDiagram } = await distImport('frame-serialize.js');

const diagram = loadFrameYaml(yamlPath);
process.stdout.write(`${JSON.stringify(serializeFrameDiagram(diagram))}\n`);
