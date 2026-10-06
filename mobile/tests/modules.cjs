const fs = require('node:fs/promises');
const path = require('node:path');

const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const modelUrl = fs.readFile(path.join(__dirname, '../src/features/bowel/model.js'), 'utf8').then(moduleUrl);

exports.modelModule = modelUrl.then((url) => import(url));
exports.clientModule = Promise.all([
  fs.readFile(path.join(__dirname, '../src/data/api/client.js'), 'utf8'),
  modelUrl,
]).then(([source, url]) => import(moduleUrl(source.replace("from '../../features/bowel/model'", `from '${url}'`))));
