// Portable fallback for sessions lacking the installed Sites workflow helper.
// Run in a TTY, send {credential: <native Sites credential>} as one JSON line.
// No credential is written to files, argv, remote URLs, or stdout.
import readline from 'node:readline';
import {spawnSync} from 'node:child_process';
const tty=process.stdin.isTTY;if(tty)spawnSync('stty',['-echo'],{stdio:'inherit'});
console.log('Ready for Site mirror JSON on stdin (input is hidden).');
const rl=readline.createInterface({input:process.stdin,terminal:false});
const line=await new Promise(resolve=>rl.once('line',resolve));rl.close();if(tty)spawnSync('stty',['echo'],{stdio:'inherit'});
let credential;try{credential=JSON.parse(line).credential;}catch{throw new Error('Expected native credential JSON');}
if(credential?.auth_mode!=='http_extra_header'||!credential.token||!credential.remote_url||!credential.branch)throw new Error('Unsupported or incomplete native credential');
const env={...process.env,GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_COUNT:'2',GIT_CONFIG_KEY_0:'http.extraHeader',GIT_CONFIG_VALUE_0:`Authorization: Bearer ${credential.token}`,GIT_CONFIG_KEY_1:'credential.helper',GIT_CONFIG_VALUE_1:''};
const run=(args,secure=false)=>{const r=spawnSync('git',args,{encoding:'utf8',env:secure?env:process.env});if(r.status!==0)throw new Error('Git mirror operation failed; no credentials were printed.');return r.stdout.trim();};
if(run(['status','--porcelain']))throw new Error('Commit the exact tested source before mirroring.');
run(['push',credential.remote_url,`HEAD:refs/heads/${credential.branch}`],true);
const sha=run(['rev-parse','HEAD']);const remote=run(['ls-remote',credential.remote_url,`refs/heads/${credential.branch}`],true).split(/\s/)[0];if(remote!==sha)throw new Error('Mirror SHA verification failed');
console.log(JSON.stringify({commit_sha:sha,pushed:true}));
