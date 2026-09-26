// Temporary: find accidentally nested CSS rules (a missing `}` nests everything
// that follows inside the previous block, so the browser silently ignores it).
import fs from 'node:fs';

const { default: postcss } = await import('postcss');

const css = fs.readFileSync('./src/style.css', 'utf8');
const root = postcss.parse(css, { from: 'src/style.css' });

const nested = [];
root.walkRules((rule) => {
  const parentRule = rule.parent;
  if (parentRule && parentRule.type === 'rule') {
    nested.push({
      child: rule.selector,
      childLine: rule.source.start.line,
      parent: parentRule.selector,
      parentLine: parentRule.source.start.line
    });
  }
});

console.log(`top-level rules: ${root.nodes.filter((n) => n.type === 'rule').length}`);
console.log(`accidentally nested rules: ${nested.length}`);
nested.slice(0, 20).forEach((entry) => {
  console.log(`  line ${entry.childLine}: "${entry.child.slice(0, 60)}" is nested inside "${entry.parent.slice(0, 60)}" (line ${entry.parentLine})`);
});

// Where did .acct-overlay end up?
root.walkRules(/acct-overlay/, (rule) => {
  const chain = [];
  for (let node = rule.parent; node && node.type !== 'root'; node = node.parent) {
    chain.unshift(node.type === 'rule' ? node.selector : `@${node.name}`);
  }
  console.log(`\n.acct-overlay found at line ${rule.source.start.line}, parent chain: ${chain.join(' > ') || '(top level)'}`);
});
