#!/usr/bin/env node

import commandLineArgs from 'command-line-args'
import build from './src/index.js'

const args = commandLineArgs([
  { name: 'source', alias: 's', type: String, defaultOption: true },
  { name: 'output', alias: 'o', type: String, defaultValue: './public' },
  { name: 'dev', alias: 'd', type: Boolean, defaultValue: false },
  { name: 'name', alias: 'n', type: String, defaultValue: 'Front export' },
  { name: 'port', alias: 'p', type: String, defaultValue: 8080 },
  {
    name: 'templates',
    alias: 't',
    type: String,
    defaultValue: './src/templates',
  },
])

build(args)
