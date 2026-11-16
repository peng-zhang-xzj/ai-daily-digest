/* Markdown -> course-site HTML renderer. Keeps all 12 lectures stylistically uniform.
   Supports: # title, meta lines, ## -> h3, ### -> h4, ```fence``` -> .flow,
   pipe tables, - / 1. lists, **bold**, `code`, [[widget:x]] mounts, ## 练习 -> collapsible. */
const WIDGETS={timeline:'timeline',data:'dataW',res:'resW',rope:'ropeW',vq:'vqW',labdl:'labdl',checklist:'checklist'};
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function inline(s){
  // escape first, then re-apply allowed inline markup
  s=esc(s);
  s=s.replace(/`([^`]+)`/g,(m,c)=>'<code>'+c+'</code>');
  s=s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,(m,t,u)=>'<a href="'+u+'" target="_blank" rel="noopener">'+t+'</a>');
  s=s.replace(/\*\*([^*]+)\*\*/g,(m,c)=>'<b>'+c+'</b>');
  return s;
}
function isTableSep(l){return /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(l)&&l.includes('-');}
function splitRow(l){return l.trim().replace(/^\||\|$/g,'').split('|').map(c=>c.trim());}

function render(md, figs){
  figs=figs||{};
  const lines=md.replace(/\r/g,'').split('\n');
  let i=0, title='', meta=[];
  // title
  while(i<lines.length&&!lines[i].trim())i++;
  if(lines[i]&&lines[i].startsWith('# ')){title=lines[i].slice(2).trim();i++;}
  // meta: everything until first '## '
  while(i<lines.length&&!lines[i].startsWith('## ')){ if(lines[i].trim())meta.push(lines[i].trim()); i++; }
  const out=[];
  if(meta.length)out.push('<div class="note"><b>本讲导航</b>:'+meta.map(inline).join('<br>')+'</div>');
  let para=[];
  const flushP=()=>{ if(para.length){out.push('<p>'+para.map(inline).join(' ')+'</p>');para=[];} };
  let inExercises=false;
  while(i<lines.length){
    let l=lines[i];
    // fenced code
    if(/^```/.test(l.trim())){flushP();i++;const buf=[];while(i<lines.length&&!/^```/.test(lines[i].trim())){buf.push(lines[i]);i++;}i++;
      out.push('<div class="flow">'+esc(buf.join('\n'))+'</div>');continue;}
    // widget token on its own line
    const wm=l.trim().match(/^\[\[widget:(\w+)\]\]$/);
    if(wm){flushP();const id=WIDGETS[wm[1]];if(id)out.push('<div id="'+id+'"></div>');i++;continue;}
    // figure token on its own line: [[fig:id]] or [[figure:id]]
    const fm=l.trim().match(/^\[\[(?:fig|figure):([\w-]+)\]\]$/);
    if(fm){flushP();const f=figs[fm[1]];
      if(f){out.push('<figure class="fig">'+f.svg+(f.cap?'<figcaption>'+inline(f.cap)+'</figcaption>':'')+'</figure>');}
      else{out.push('<!-- missing figure: '+fm[1]+' -->');}
      i++;continue;}
    // headings
    if(l.startsWith('### ')){flushP();out.push('<h4>'+inline(l.slice(4).trim())+'</h4>');i++;continue;}
    if(l.startsWith('## ')){flushP();const h=l.slice(3).trim();inExercises=/练习|检查题|习题/.test(h);
      out.push('<h3>'+inline(h)+'</h3>');i++;continue;}
    // table
    if(l.includes('|')&&i+1<lines.length&&isTableSep(lines[i+1])){flushP();
      const head=splitRow(l);i+=2;const rows=[];
      while(i<lines.length&&lines[i].includes('|')&&lines[i].trim()){rows.push(splitRow(lines[i]));i++;}
      let t='<table><tr>'+head.map(c=>'<th>'+inline(c)+'</th>').join('')+'</tr>';
      rows.forEach(r=>{t+='<tr>'+r.map(c=>'<td>'+inline(c)+'</td>').join('')+'</tr>';});
      t+='</table>';out.push(t);continue;}
    // exercises: numbered items -> collapsible
    if(inExercises){const em=l.match(/^\s*\d+\.\s+(.*)$/);
      if(em){flushP();let body=em[1];
        // pull following non-numbered lines into same item
        while(i+1<lines.length&&lines[i+1].trim()&&!/^\s*\d+\.\s/.test(lines[i+1])&&!lines[i+1].startsWith('#')){i++;body+=' '+lines[i].trim();}
        const sp=body.split(/答案[：:]|答[：:]/);const q=sp[0].trim();const a=(sp[1]||'').trim();
        out.push('<details class="quiz"><summary>🧠 '+inline(q)+'</summary><div class="qa"><b>答:</b>'+inline(a)+'</div></details>');
        i++;continue;}
    }
    // blockquote -> .key highlight
    if(/^\s*>\s?/.test(l)){flushP();const buf=[];while(i<lines.length&&/^\s*>\s?/.test(lines[i])){buf.push(lines[i].replace(/^\s*>\s?/,''));i++;}
      out.push('<div class="key">'+buf.map(inline).join('<br>')+'</div>');continue;}
    // lists
    if(/^\s*[-*]\s+/.test(l)){flushP();const items=[];while(i<lines.length&&/^\s*[-*]\s+/.test(lines[i])){items.push(lines[i].replace(/^\s*[-*]\s+/,''));i++;}
      out.push('<ul>'+items.map(x=>'<li>'+inline(x)+'</li>').join('')+'</ul>');continue;}
    if(/^\s*\d+\.\s+/.test(l)){flushP();const items=[];while(i<lines.length&&/^\s*\d+\.\s+/.test(lines[i])){items.push(lines[i].replace(/^\s*\d+\.\s+/,''));i++;}
      out.push('<ol>'+items.map(x=>'<li>'+inline(x)+'</li>').join('')+'</ol>');continue;}
    // blank -> para break
    if(!l.trim()){flushP();i++;continue;}
    // note/key/warn shortcuts: lines starting with 「注意」「记住」etc optional; default paragraph
    para.push(l.trim());i++;
  }
  flushP();
  return {title, html:'\n  '+out.join('\n  ')+'\n  '};
}
module.exports={render};

if(require.main===module){
  const fs=require('fs');const p=process.argv[2];
  const r=render(fs.readFileSync(p,'utf8'));
  if(process.argv[3]==='--html')process.stdout.write(r.html);
  else console.log(JSON.stringify({title:r.title,chars:r.html.length,h3:(r.html.match(/<h3>/g)||[]).length,flow:(r.html.match(/class="flow"/g)||[]).length,tables:(r.html.match(/<table>/g)||[]).length,quiz:(r.html.match(/class="quiz"/g)||[]).length}));
}
