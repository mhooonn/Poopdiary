const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Linter } = require('eslint');
const project = require('../tooling/ui-rules.cjs');

const linter = new Linter();
function inspect(code, rule = 'stable-control-layout') {
  return linter.verify(code, [{
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { project },
    rules: { [`project/${rule}`]: 'error' },
  }]);
}

test('interaction states cannot change control geometry or typography', () => {
  for (const property of ['borderWidth', 'padding', 'height', 'fontWeight', 'transform']) {
    const code = `function Example({ selected }) { return <Pressable style={{ ${property}: selected ? 2 : 1 }} />; }`;
    assert.equal(inspect(code).length, 1, property);
  }
  assert.equal(inspect(`function Example() { return <Pressable style={({pressed}) => ({transform: [{scale: pressed ? 0.98 : 1}]})} />; }`).length, 1);
});

test('loading and selection indicators require an overlay or permanent fixed slot', () => {
  assert.equal(inspect(`function Example({selected}) { return <Pressable>{selected && <Check />}</Pressable>; }`).length, 1);
  assert.equal(inspect(`function Example({loading}) { return <Pressable>{loading && <ActivityIndicator />}</Pressable>; }`).length, 1);
  assert.equal(inspect(`function Example({selected}) { return <Pressable><View style={{width:20,height:20}}>{selected && <Check />}</View></Pressable>; }`).length, 0);
  assert.equal(inspect(`function Example({loading}) { return <Pressable><View style={{position:'absolute'}}>{loading && <ActivityIndicator />}</View></Pressable>; }`).length, 0);
});

test('paint-only feedback and responsive layout remain allowed', () => {
  const code = `function Example({selected, width}) { return <Pressable style={({pressed}) => ({borderWidth:1, borderColor:selected?'red':'gray', opacity:pressed?0.7:1, minWidth:width<360?100:120})} />; }`;
  assert.deepEqual(inspect(code), []);
});

test('screens use shared colors and sizing rather than private literals', () => {
  assert.equal(inspect(`const style = {backgroundColor:'#ffffff'};`, 'design-tokens').length, 1);
  assert.equal(inspect(`const style = {padding:16};`, 'design-tokens').length, 1);
  assert.deepEqual(inspect(`const style = {padding:theme.spacing.md, color:theme.colors.text.primary};`, 'design-tokens'), []);
});
