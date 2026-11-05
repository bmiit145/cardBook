const { execSync } = require('child_process');

function run(cmd) {
  console.log('>>>', cmd);
  try {
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    console.log(out);
    return out;
  } catch (err) {
    console.error('ERROR in', cmd);
    if (err.stdout) console.error(err.stdout.toString());
    if (err.stderr) console.error(err.stderr.toString());
    throw err;
  }
}

try {
  run('git add .');
  run('git commit -m "feat: CardBook rebranding, multi-tenant access control, safe area insets and navigation fixes"');
  run('git push origin main');
  console.log('Push complete!');
} catch (e) {
  process.exit(1);
}
