#!/usr/bin/env node

import commandLineArgs from 'command-line-args'
import build from './src/index.js'

const args = commandLineArgs([
  { name: 'source', alias: 's', type: String, defaultOption: true },
  { name: 'output', alias: 'o', type: String, defaultValue: './public' },
])

build(args)
