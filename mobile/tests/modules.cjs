const fs = require('node:fs/promises');
const path = require('node:path');

const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const modelUrl = fs.readFile(path.join(__dirname, '../src/features/bowel/model.js'), 'utf8').then(moduleUrl);
const reminderModelUrl = fs.readFile(path.join(__dirname, '../src/features/reminders/model.js'), 'utf8').then(moduleUrl);

exports.modelModule = modelUrl.then((url) => import(url));
exports.reminderModelModule = reminderModelUrl.then((url) => import(url));
exports.clientModule = Promise.all([
  fs.readFile(path.join(__dirname, '../src/data/api/client.js'), 'utf8'),
  modelUrl,
]).then(([source, url]) => import(moduleUrl(source.replace("from '../../features/bowel/model'", `from '${url}'`))));

exports.diaryModelModule = Promise.all([
  fs.readFile(path.join(__dirname, '../src/features/diary/model.js'), 'utf8'),
  modelUrl,
]).then(([source, url]) => import(moduleUrl(source.replace("from '../bowel/model'", `from '${url}'`))));

exports.foodPhotoModelModule = fs.readFile(path.join(__dirname, '../src/features/food/photoModel.js'), 'utf8')
  .then(moduleUrl)
  .then((url) => import(url));

exports.appearanceStorageModule = fs.readFile(path.join(__dirname, '../src/design-system/appearanceStorage.js'), 'utf8')
  .then(moduleUrl)
  .then((url) => import(url));

exports.insightsModelModule = Promise.all([
  fs.readFile(path.join(__dirname, '../src/features/insights/model.js'), 'utf8'),
  modelUrl,
]).then(([source, url]) => import(moduleUrl(source.replace("from '../bowel/model'", `from '${url}'`))));

exports.aiModelModule = Promise.all([
  fs.readFile(path.join(__dirname, '../src/features/insights/aiModel.js'), 'utf8'),
  modelUrl,
]).then(([source, url]) => import(moduleUrl(source.replace("from '../bowel/model'", `from '${url}'`))));

exports.aiClientModule = Promise.all([
  fs.readFile(path.join(__dirname, '../src/features/insights/aiClient.js'), 'utf8'),
  fs.readFile(path.join(__dirname, '../src/features/insights/aiModel.js'), 'utf8'),
  modelUrl,
]).then(([source, modelSource, bowelUrl]) => {
  const url = moduleUrl(modelSource.replace("from '../bowel/model'", `from '${bowelUrl}'`));
  return import(moduleUrl(source.replace("from './aiModel'", `from '${url}'`)));
});
