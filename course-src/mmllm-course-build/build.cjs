/* Assemble the course site: render each lecture md -> html, inject the LECTURES array into template. */
const fs=require('fs');
const path=require('path');
const {render}=require('./render.cjs');
const {FIGS}=require('./figures.cjs');
const ROOT=process.env.COURSE_ROOT||path.resolve(__dirname,'..');
const MINE=path.join(ROOT,'mmllm-course-build/lectures');
const DAYONE=path.join(ROOT,'mmllm-course-expanded-dayone');
const DAYONE_FIGS=path.join(ROOT,'mmllm-course-illustrated-dayone');
// merge DayOne's illustrated figures via manifest.json: [{id,caption,svg:"file.svg"}]
(function loadDayOneFigs(){
  const mf=path.join(DAYONE_FIGS,'manifest.json');
  if(!fs.existsSync(mf))return;
  let man; try{man=JSON.parse(fs.readFileSync(mf,'utf8'));}catch(e){console.error('bad manifest',e.message);return;}
  const list=Array.isArray(man)?man:(man.figures||[]);
  let n=0;
  for(const m of list){
    const svgPath=path.join(DAYONE_FIGS,m.svg||(m.id+'.svg'));
    if(!fs.existsSync(svgPath)){console.error('missing svg for',m.id);continue;}
    FIGS[m.id]={cap:m.caption||'', svg:fs.readFileSync(svgPath,'utf8')};
    n++;
  }
  console.log('loaded',n,'DayOne figures');
})();
const cfg=JSON.parse(fs.readFileSync(path.join(ROOT,'mmllm-course-build/lectures.config.json'),'utf8'));
// id -> md path (mine vs DayOne); l8 falls back to placeholder until delivered
function mdPath(id){
  const mine=['l0','l5','l9','l10','lab'];
  if(mine.includes(id))return path.join(MINE,id+'.md');
  const d=path.join(DAYONE,id+'.md');
  if(fs.existsSync(d))return d;
  if(id==='l8')return path.join(MINE,'_l8_placeholder.md');
  throw new Error('missing md for '+id);
}
const objs=cfg.map(c=>{
  const md=fs.readFileSync(mdPath(c.id),'utf8');
  const {html}=render(md, FIGS);
  return `{id:${JSON.stringify(c.id)}, grp:${JSON.stringify(c.grp)}, kick:${JSON.stringify(c.kick)}, title:${JSON.stringify(c.title)}, lead:${JSON.stringify(c.lead)}, html:${JSON.stringify(html)}}`;
});
const arr='[\n'+objs.join(',\n')+'\n]';
let tmpl=fs.readFileSync(path.join(ROOT,'mmllm-course-build/template.html'),'utf8');
// inject DayOne's figure-theme.css into <style> so his d1-* classes resolve
const themeCss=path.join(DAYONE_FIGS,'figure-theme.css');
if(fs.existsSync(themeCss)){
  const css=fs.readFileSync(themeCss,'utf8');
  tmpl=tmpl.replace('</style>', '/* DayOne figure-theme.css */\n'+css+'\n</style>');
  console.log('injected figure-theme.css');
}
const out=tmpl.replace('__LECTURES__',arr);
const dst=path.join(ROOT,'mmllm-course-build/staged-index.html');
fs.writeFileSync(dst,out);
console.log('staged ->',dst,'size',out.length,'lectures',cfg.length);
