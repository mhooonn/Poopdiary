const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

// Load the pure token file without changing the Expo project's module system.
const source = readFileSync(path.join(__dirname, '../src/design-system/theme.js'), 'utf8');
const themes = import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

function luminance(hex) {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(fg, bg) {
  const [first, second] = [luminance(fg), luminance(bg)];
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

for (const appearance of ['light', 'dark']) {
  test(`${appearance}: body and supporting text meet AA contrast on all shared surfaces`, async () => {
    const theme = (await themes)[`${appearance}Theme`];
    for (const bg of Object.values(theme.colors.surface)) {
      for (const name of ['primary', 'secondary']) assert.ok(contrast(theme.colors.text[name], bg) >= 4.5, `${name} on ${bg}`);
    }
    for (const group of ['entry', 'beverage', 'severity', 'feedback']) {
      for (const [name, pair] of Object.entries(theme.colors[group])) assert.ok(contrast(pair.fg, pair.bg) >= 4.5, `${group}.${name}`);
    }
  });

  test(`${appearance}: action feedback and essential control marks stay readable`, async () => {
    const theme = (await themes)[`${appearance}Theme`];
    for (const colors of Object.values(theme.colors.action)) {
      assert.ok(contrast(colors.foreground, colors.background) >= 4.5);
      assert.ok(contrast(colors.foreground, colors.pressed) >= 4.5);
    }
    for (const bg of Object.values(theme.colors.surface)) {
      assert.ok(contrast(theme.colors.border.control, bg) >= 3);
      assert.ok(contrast(theme.colors.focus, bg) >= 3);
    }
  });
}

test('both themes offer the same tokens and usable shared sizes', async () => {
  const { lightTheme, darkTheme } = await themes;
  const keys = (value) => Object.fromEntries(Object.entries(value).map(([key, child]) => [key, child && typeof child === 'object' ? keys(child) : typeof child]));
  assert.deepEqual(keys(lightTheme), keys(darkTheme));
  assert.deepEqual(lightTheme.spacing, darkTheme.spacing);
  assert.deepEqual(lightTheme.typography, darkTheme.typography);
  assert.ok(lightTheme.controls.minimumTouchTarget >= 48);
  assert.ok(lightTheme.typography.body.fontSize >= 16);
  assert.ok(lightTheme.typography.caption.fontSize >= 14);
});
