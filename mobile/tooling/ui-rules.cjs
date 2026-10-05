const tokenProperties = /^(?:fontSize|lineHeight|letterSpacing|borderRadius|border.*Radius|borderWidth|border.*Width|padding.*|margin.*|gap|rowGap|columnGap)$/;
const interactionNames = /^(?:selected|pressed|focused|disabled|loading|checked|busy|saving|isSelected|isPressed|isFocused|isDisabled|isLoading|isChecked|isBusy|isSaving)$/;
// Outlines, colors and opacity do not consume layout space. Font metrics and
// transforms do: even a visual scale makes a pressed control move on screen.
const layoutProperties = /^(?:width|height|minWidth|minHeight|maxWidth|maxHeight|aspectRatio|boxSizing|display|position|top|right|bottom|left|start|end|inset.*|padding.*|margin.*|gap|rowGap|columnGap|border.*Width|flex|flexBasis|flexGrow|flexShrink|flexDirection|flexWrap|alignItems|alignSelf|alignContent|justifyContent|fontSize|fontFamily|fontWeight|fontStyle|fontVariant|fontStretch|fontFeatureSettings|fontVariationSettings|fontKerning|lineHeight|letterSpacing|wordSpacing|textIndent|textTransform|includeFontPadding|textAlign|textAlignVertical|verticalAlign|writingDirection|whiteSpace|wordBreak|wordWrap|overflowWrap|lineClamp|transform|transformOrigin)$/;
const propertyName = (node) => !node.computed ? node.key.name ?? node.key.value : node.key.type === 'Literal' ? node.key.value : undefined;

const stableControlLayout = {
  meta: {
    type: 'problem', schema: [],
    messages: {
      layout: 'Interaction state must not change "{{property}}". Keep control geometry fixed; use color, opacity or a reserved overlay.',
      indicator: 'State indicators need a constant reserved icon slot or an absolute overlay so they cannot move control content.',
    },
  },
  create(context) {
    const source = context.sourceCode;
    const reported = new WeakSet();
    const indicators = new Set(['Check', 'ActivityIndicator', 'Hourglass']);
    const controls = new Set(['Pressable', 'Button', 'Choice', 'IconButton', 'TextInput', 'TouchableOpacity', 'TouchableHighlight', 'TouchableWithoutFeedback']);
    const views = new Set(['View']);
    const unwrap = (node) => {
      while (node && ['TSAsExpression', 'TSSatisfiesExpression', 'TSNonNullExpression', 'TypeCastExpression', 'ChainExpression'].includes(node.type)) node = node.expression;
      return node;
    };
    const variable = (node) => {
      for (let scope = source.getScope(node); scope; scope = scope.upper) {
        const found = scope.set.get(node.name);
        if (found) return found;
      }
      return undefined;
    };
    const initializer = (node) => {
      const declaration = variable(node)?.defs.find((def) => def.type === 'Variable')?.node;
      // A destructured binding is not the entire initializer (in particular,
      // unrelated useState bindings must not all resolve to useState(false)).
      return declaration?.id.type === 'Identifier' ? declaration.init : undefined;
    };
    const callable = (node) => {
      node = unwrap(node);
      if (node?.type === 'Identifier') {
        const definition = variable(node)?.defs.find((def) => def.type === 'FunctionName' || def.type === 'Variable');
        node = definition?.type === 'FunctionName' ? definition.node : definition?.node.init;
      }
      return node && ['ArrowFunctionExpression', 'FunctionExpression', 'FunctionDeclaration'].includes(node.type) ? node : undefined;
    };
    const resolve = (node, seen = new Set()) => {
      node = unwrap(node);
      if (!node || seen.has(node)) return node;
      seen.add(node);
      if (node.type === 'Identifier') return initializer(node) ? resolve(initializer(node), seen) : node;
      if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression' && node.callee.object.name === 'StyleSheet' && node.callee.property.name === 'create') return resolve(node.arguments[0], seen);
      if (node.type === 'MemberExpression') {
        const object = resolve(node.object, seen);
        const name = node.computed ? node.property.value : node.property.name;
        const property = object?.type === 'ObjectExpression' && object.properties.find((item) => item.type === 'Property' && propertyName(item) === name);
        if (property) return resolve(property.value, seen);
      }
      return node;
    };
    // Token identity ignores formatting/comments and follows local constants.
    const key = (node) => node ? source.getTokens(resolve(node)).map((token) => token.value).join(' ') : '<absent>';
    const same = (left, right) => key(left) === key(right);
    const returns = (node) => {
      if (!node) return [];
      if (node.type === 'ReturnStatement') return [node.argument];
      if (['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(node.type)) return [];
      return (source.visitorKeys[node.type] ?? []).flatMap((field) => {
        const children = node[field];
        return (Array.isArray(children) ? children : [children]).flatMap(returns);
      });
    };
    const depends = (raw, seeds, seen = new Set()) => {
      const node = unwrap(raw);
      if (!node || seen.has(node)) return false;
      seen = new Set(seen).add(node);
      if (seeds.has(key(node))) return true;
      if (node.type === 'Identifier') {
        if (interactionNames.test(node.name)) return true;
        const binding = variable(node);
        // Preserve aliases in destructured interaction props: selected: chosen.
        if (binding?.identifiers.some((id) => {
          const pattern = id.parent?.type === 'AssignmentPattern' ? id.parent.parent : id.parent;
          return pattern?.type === 'Property' && interactionNames.test(propertyName(pattern));
        })) return true;
        return depends(initializer(node), seeds, seen);
      }
      if (node.type === 'MemberExpression') {
        const object = unwrap(node.object);
        const parameter = object?.type === 'Identifier' && variable(object)?.defs.some((def) => def.type === 'Parameter');
        if (parameter && interactionNames.test(node.computed ? node.property.value : node.property.name)) return true;
        // A theme color named selected/pressed is a color value, not UI state.
        return depends(node.object, seeds, seen) || (node.computed && depends(node.property, seeds, seen));
      }
      if (node.type === 'ConditionalExpression') return (!same(node.consequent, node.alternate) && depends(node.test, seeds, seen)) || depends(node.consequent, seeds, seen) || depends(node.alternate, seeds, seen);
      if (node.type === 'Property') return depends(node.value, seeds, seen);
      if (node.type === 'CallExpression') {
        const fn = callable(node.callee);
        return node.arguments.some((arg) => depends(arg, seeds, seen)) || (fn && (fn.body.type === 'BlockStatement' ? returns(fn.body) : [fn.body]).some((value) => depends(value, seeds, seen)));
      }
      if (['ArrowFunctionExpression', 'FunctionExpression', 'FunctionDeclaration'].includes(node.type)) return (node.body.type === 'BlockStatement' ? returns(node.body) : [node.body]).some((value) => depends(value, seeds, seen));
      return (source.visitorKeys[node.type] ?? []).some((field) => {
        const children = node[field];
        return (Array.isArray(children) ? children : [children]).some((child) => depends(child, seeds, seen));
      });
    };
    const addSeed = (seeds, raw) => {
      let node = unwrap(raw);
      // Boolean wrappers describe the same interaction state as their operand.
      while (node?.type === 'UnaryExpression' && node.operator === '!') node = node.argument;
      if (node?.type === 'CallExpression' && node.callee.name === 'Boolean') node = node.arguments[0];
      if (node && !(node.type === 'Literal')) seeds.add(key(node));
    };
    const stateSeeds = (attribute) => {
      const seeds = new Set();
      // Accessibility bindings catch state with domain-specific names such as
      // selectedDay or level, without treating every data value as UI state.
      for (let ancestor = attribute.parent; ancestor; ancestor = ancestor.parent) {
        const opening = ancestor.type === 'JSXOpeningElement' ? ancestor : ancestor.type === 'JSXElement' ? ancestor.openingElement : undefined;
        if (!opening) continue;
        for (const attr of opening.attributes) {
          if (attr.type !== 'JSXAttribute' || attr.value?.type !== 'JSXExpressionContainer') continue;
          const name = attr.name.name;
          if (interactionNames.test(name) || ['aria-checked', 'aria-selected', 'aria-disabled', 'aria-busy'].includes(name)) addSeed(seeds, attr.value.expression);
          if (name === 'accessibilityState') {
            const state = resolve(attr.value.expression);
            if (state?.type === 'ObjectExpression') for (const prop of state.properties) {
              if (prop.type === 'Property' && interactionNames.test(propertyName(prop))) addSeed(seeds, prop.value);
            }
          }
        }
      }
      return seeds;
    };
    const combine = (test, left, right, seeds) => {
      const result = new Map();
      for (const name of new Set([...left.keys(), ...right.keys()])) {
        const a = left.get(name), b = right.get(name);
        const entry = a ?? b;
        const changing = a?.key !== b?.key;
        result.set(name, {
          node: entry.node,
          key: changing ? `${key(test)} ? ${a?.key} : ${b?.key}` : entry.key,
          issue: a?.issue ?? b?.issue ?? (changing && depends(test, seeds) ? entry.node : undefined),
        });
      }
      return result;
    };
    // Flatten resolved style objects/arrays in override order. Carry the base
    // into each branch so a selected overlay may repeat a reserved border.
    const styles = (raw, seeds, base = new Map(), seen = new Set()) => {
      const node = resolve(raw);
      if (!node || seen.has(node)) return base;
      seen = new Set(seen).add(node);
      if (node.type === 'ObjectExpression') {
        let result = new Map(base);
        for (const prop of node.properties) {
          if (prop.type === 'SpreadElement') result = styles(prop.argument, seeds, result, seen);
          else if (prop.type === 'Property' && layoutProperties.test(propertyName(prop))) result.set(propertyName(prop), { node: prop, key: key(prop.value), issue: depends(prop.value, seeds) ? prop : undefined });
        }
        return result;
      }
      if (node.type === 'ArrayExpression') return node.elements.reduce((result, value) => styles(value, seeds, result, seen), base);
      if (node.type === 'ConditionalExpression') return combine(node.test, styles(node.consequent, seeds, base, seen), styles(node.alternate, seeds, base, seen), seeds);
      if (node.type === 'LogicalExpression') return combine(node.left, styles(node.right, seeds, base, seen), base, seeds);
      const fn = callable(node.type === 'CallExpression' ? node.callee : node);
      if (fn) {
        const localSeeds = new Set(seeds);
        if (node.type === 'CallExpression') fn.params.forEach((param, index) => {
          if (depends(node.arguments[index], seeds) && param.type === 'Identifier') localSeeds.add(key(param));
        });
        if (fn.body.type !== 'BlockStatement') return styles(fn.body, localSeeds, base, seen);
        const statements = (items) => {
          for (let index = 0; index < items.length; index++) {
            const statement = items[index];
            if (statement.type === 'ReturnStatement') return styles(statement.argument, localSeeds, base, seen);
            if (statement.type === 'IfStatement') {
              const rest = items.slice(index + 1);
              const branch = (value) => statements(value?.type === 'BlockStatement' ? [...value.body, ...rest] : value ? [value, ...rest] : rest);
              return combine(statement.test, branch(statement.consequent), branch(statement.alternate), localSeeds);
            }
          }
          return base;
        };
        return statements(fn.body.body);
      }
      return base;
    };
    const check = (node, seeds) => {
      for (const [property, entry] of styles(node, seeds)) if (entry.issue && !reported.has(entry.issue)) {
        reported.add(entry.issue);
        context.report({ node: entry.issue, messageId: 'layout', data: { property } });
      }
    };
    const elementName = (node) => node.openingElement.name.name ?? node.openingElement.name.property?.name;
    const isControl = (node) => controls.has(elementName(node)) || node.openingElement.attributes.some((attr) => attr.type === 'JSXAttribute' && ['accessibilityRole', 'role'].includes(attr.name.name) && ['button', 'radio', 'checkbox', 'switch', 'tab', 'slider'].includes(attr.value?.value));
    const elementStyles = (node) => {
      const attr = node.openingElement.attributes.find((attr) => attr.type === 'JSXAttribute' && attr.name.name === 'style');
      return attr?.value?.type === 'JSXExpressionContainer' ? styles(attr.value.expression, stateSeeds(attr)) : new Map();
    };
    const absolute = (node) => {
      const position = elementStyles(node).get('position');
      return position && !position.issue && resolve(position.node.value)?.value === 'absolute';
    };
    const reservedSlot = (node) => {
      if (!views.has(elementName(node))) return false;
      const content = node.children.filter((child) => child.type !== 'JSXText' || child.value.trim());
      if (content.length !== 1) return false;
      const geometry = elementStyles(node);
      return ['width', 'height'].every((dimension) => {
        const entry = geometry.get(dimension);
        const value = entry && resolve(entry.node.value);
        return entry && !entry.issue && !(value?.type === 'Literal' && (!value.value || value.value === 'auto'));
      });
    };
    const checkIndicator = (node) => {
      if (!indicators.has(elementName(node))) return;
      const seeds = stateSeeds(node);
      let condition, control;
      let overlay = absolute(node);
      // Use the outermost state condition within the control. A fixed slot
      // *inside* that condition still disappears and adds/removes row space.
      for (let ancestor = node.parent, child = node; ancestor; child = ancestor, ancestor = ancestor.parent) {
        if (ancestor.type === 'JSXElement') {
          if (isControl(ancestor)) { control = ancestor; break; }
          overlay ||= absolute(ancestor);
        }
        if (ancestor.type === 'ConditionalExpression' && depends(ancestor.test, seeds)) condition = ancestor;
        if (ancestor.type === 'LogicalExpression' && ancestor.right === child && depends(ancestor.left, seeds)) condition = ancestor;
      }
      if (!control || !condition || overlay) return;
      for (let ancestor = condition.parent; ancestor && ancestor !== control; ancestor = ancestor.parent) {
        if (ancestor.type === 'JSXElement' && reservedSlot(ancestor)) return;
      }
      context.report({ node: node.openingElement, messageId: 'indicator' });
    };
    return {
      ImportDeclaration(node) {
        if (!['react-native', 'lucide-react-native'].includes(node.source.value)) return;
        for (const specifier of node.specifiers) if (specifier.type === 'ImportSpecifier') {
          const imported = specifier.imported.name;
          if (indicators.has(imported)) indicators.add(specifier.local.name);
          if (controls.has(imported)) controls.add(specifier.local.name);
          if (imported === 'View') views.add(specifier.local.name);
        }
      },
      JSXElement: checkIndicator,
      JSXAttribute(node) {
        const name = node.name.name;
        if (typeof name !== 'string' || node.value?.type !== 'JSXExpressionContainer') return;
        const seeds = stateSeeds(node);
        if (/^(?:style|\w+Style)$/.test(name)) check(node.value.expression, seeds);
        // Restrict direct props to unambiguous size/wrapping inputs: a prop
        // named right/top can be a ReactNode slot rather than a position.
        else if (['width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight', 'size', 'numberOfLines', 'allowFontScaling', 'adjustsFontSizeToFit'].includes(name) && depends(node.value.expression, seeds)) context.report({ node, messageId: 'layout', data: { property: name } });
      },
      CallExpression(node) {
        if (node.callee.type === 'MemberExpression' && node.callee.object.name === 'StyleSheet' && node.callee.property.name === 'create') {
          const object = unwrap(node.arguments[0]);
          if (object?.type === 'ObjectExpression') for (const prop of object.properties) if (prop.type === 'Property') check(prop.value, new Set());
        }
      },
    };
  },
};
const rules = {
  'stable-control-layout': stableControlLayout,
  'design-tokens': {
    meta: { type: 'problem', schema: [], messages: { color: 'Use a semantic theme color.', size: 'Use the shared typography, spacing or radius tokens.' } },
    create(context) {
      return {
        Literal(node) {
          if (typeof node.value === 'string' && /^(?:#[\da-f]{3,8}$|rgba?\(|hsla?\()/i.test(node.value)) context.report({ node, messageId: 'color' });
        },
        Property(node) {
          const name = node.key.name ?? node.key.value;
          if (tokenProperties.test(name) && node.value.type === 'Literal' && typeof node.value.value === 'number' && node.value.value !== 0) context.report({ node, messageId: 'size' });
        },
      };
    },
  },
};
module.exports = { rules };
