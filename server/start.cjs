// PM2 entry point - .cjs forces CommonJS mode even when package.json has "type":"module"
require('tsx/cjs');
require('./index.ts');
