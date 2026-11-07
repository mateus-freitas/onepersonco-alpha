import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deriveFit} from '../scripts/lib/ideas.mjs';
import {readFile, mkdir} from 'node:fs/promises';

// No server or live requests: Chromium receives only synthetic, intercepted routes.
// PLAYWRIGHT_MODULE may point to an existing installation without changing packages.
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const keys=['acquisition','technical','capacity','marketing','market','differentiation','defensibility'];
const dimensions=keys.map(key=>({key,label:key[0].toUpperCase()+key.slice(1),favorable:'Synthetic favorable definition'}));
const states=['captured','researching','shortlisted','building','parked','archived'];
const projectData={generatedAt:'2026-11-07T12:00:00.000Z',projects:[]};
if(process.env.IDEAS_ARTIFACT_DIR)await mkdir(process.env.IDEAS_ARTIFACT_DIR,{recursive:true});
const original='\uFEFFSynthetic narrative\r\nwith <script>unsafe()</script>\r\n  preserved spacing';
function idea(n) {return {id:`idea-${n}`,revision:1,title:`Synthetic opportunity ${n}`,original,summary:`Problem ${n}: a synthetic audience needs a small workflow.`,nextDecision:'Validate the workflow with three interviews',state:n===4 ? 'archived':'captured',projectId:null,createdAt:'2026-11-07T12:00:00.000Z',updatedAt:`2026-11-07T12:00:0${n}.000Z`,researchDate:null,mvp:{scope:'One useful workflow',platform:'Web'},assessments:Object.fromEntries(keys.map(key=>[key,{judgment:'unknown',confidence:null,reason:'',rationale:'',evidence:[],counterevidence:[],nextQuestion:'What would validate this assumption?',reviewedAt:null}])),questions:[],sources:[],keywords:[]};}
async function setup({snapshot=false, missing=false, failure=false}={}) {
  const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH}: {})});
  const page=await browser.newPage({viewport:{width:1180,height:900}});
  let records=[1,2,3,4].map(idea), requests=[], conflict=false, addAttempts=0;
  records[1].sources=[{id:'S1',title:'Synthetic source',url:'https://example.com/synthetic',publisher:'Synthetic publisher',publishedAt:'2026-10',checkedAt:'2026-11-07',note:'A synthetic observation, not market evidence.'}];
  records[1].assessments.acquisition={...records[1].assessments.acquisition,judgment:'mixed',confidence:'low',reason:'Synthetic demand remains uncertain',rationale:'Synthetic observed evidence and inference are distinct.',evidence:['S1'],reviewedAt:'2026-11-07'};
  records[1].researchDate='2026-11-07';
  records[1].keywords=[{term:'synthetic query',market:'PT',language:'pt',volume:null,difficulty:0,checkedAt:'2026-11-07',sourceId:'S1'}];
  let writeGate=null;
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const data=()=>({ok:true,ideas:records.map(i=>({...i,fit:deriveFit(i.assessments)})),dimensions,states,projects:[{id:'synthetic',name:'Synthetic project'}]});
  await page.route('http://ideas.test/**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname === '/ideas.json')return route.fulfill({status:failure?500:200,json:failure?{ok:false,error:'Synthetic read failure'}:data()});
    if(url.pathname === '/data.json')return route.fulfill({json:projectData});
    if(url.pathname === '/idea/add'){
      const body=route.request().postDataJSON();requests.push(body);addAttempts++;
      if(addAttempts===1)return route.abort();
      const record={...idea(5),title:body.title,original:body.original};records.push(record);
      return route.fulfill({json:{ok:true,idea:record}});
    }
    if(url.pathname === '/idea/update'){
      const body=route.request().postDataJSON();requests.push(body);
      if(writeGate)await writeGate;
      const base=records.find(i=>i.id===body.id);
      if(conflict){conflict=false;const current={...base,revision:2,title:'Latest synthetic title'};records=records.map(i=>i.id === base.id ? current : i);return route.fulfill({status:409,json:{ok:false,code:'conflict',error:'Record changed elsewhere',current}});}
      const record={...base,...body.patch,assessments:{...base.assessments,...body.patch.assessments},revision:base.revision+1};
      records=records.map(i=>i.id===record.id?record:i);return route.fulfill({json:{ok:true,idea:record}});
    }
    const name=url.pathname === '/' ? 'app.html' : url.pathname.slice(1);
    if(!['app.html','global.css','ideas.js'].includes(name))throw Error(`Unexpected request ${url}`);
    let body=await readFile(new URL(name,import.meta.url),'utf8');
    if(name==='app.html' && snapshot)body=body.replace('<!--__DATA__-->',`<script>window.__DATA__=${JSON.stringify({...projectData,...(!missing?{ideas:data()}:{})}).replace(/</g,'\\u003c')}</script>`);
    return route.fulfill({body,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html'});
  });
  await page.goto('http://ideas.test/');
  await page.locator('#area-nav a').first().waitFor();
  return {browser,page,errors,requests,changeRecord:(id,patch)=>{records=records.map(i=>i.id===id?{...i,...patch,revision:i.revision+1}:i);},holdWrites:()=>{let release;writeGate=new Promise(r=>{release=r;});return ()=>{writeGate=null;release();};},setConflict:()=>{conflict=true;},setFailure:v=>{failure=v;}};
}
async function goIdeas(page){await page.locator('#area-nav a').nth(1).click();await page.locator('.idea-list').waitFor();}
async function noOverflow(page){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+1));}

test('navigation, list search, selection cap, comparison, project isolation and back',async()=>{
 const {browser,page,errors}=await setup();try{
  assert.equal(await page.locator('#ideas-view').isVisible(),false);await page.locator('[data-tab="docs"]').click();
  await goIdeas(page);assert.equal(await page.locator('#chips').isVisible(),false);assert.equal(await page.locator('#foot').isVisible(),false);
  assert.equal(await page.locator('.idea-list tbody tr').count(),3);
  for(const input of await page.locator('[data-idea-select]').all())await input.check();
  await page.locator('[name="filter"]').selectOption('all');
  await page.locator('[data-idea-select="idea-4"]').click();assert.equal(await page.locator('[data-idea-select="idea-4"]').isChecked(),false);
  assert.match(await page.locator('#idea-selection-error').textContent(),/up to 3/);
  await page.locator('#idea-search').fill('Problem 2');assert.equal(await page.locator('.idea-list tbody tr').count(),1);
  await page.getByRole('button',{name:'Compare (3)',exact:true}).click();await page.locator('.idea-compare-desktop').waitFor();assert.equal(await page.locator('.idea-compare-desktop tbody tr').count(),11);
  await page.locator('.idea-compare-desktop [data-idea-action="evidence"]').first().click();assert.equal(await page.locator('.idea-compare-desktop .idea-evidence').count(),3);
  await page.locator('.idea-compare-desktop a').first().click();await page.getByRole('heading',{name:'Original idea',exact:true}).waitFor();
  assert.equal(await page.locator('.idea-original script').count(),0);assert.match(await page.locator('.idea-original').textContent(),/<script>/);
  await page.goBack();await page.locator('.idea-compare-desktop').waitFor();await page.goBack();await page.locator('#idea-search').waitFor();assert.equal(await page.locator('#idea-search').inputValue(),'Problem 2');
  await page.locator('#area-nav a').first().click();await page.waitForFunction(()=>!document.querySelector('#view').hidden);assert.equal(await page.evaluate(()=>state.tab),'docs');
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});

test('capture uncertain retry, focus trap and dirty navigation preserve drafts',async()=>{
 const {browser,page,requests,errors}=await setup();try{
  await goIdeas(page);await page.getByRole('button',{name:'+ new idea',exact:true}).click();
  assert.equal(await page.evaluate(()=>document.activeElement.name),'title');
  await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Create idea');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.name),'title');
  await page.locator('#idea-capture [name="title"]').fill('Synthetic capture');
  await page.locator('#idea-capture [name="original"]').fill('Verbatim\n\nSynthetic text <b>');
  if(process.env.IDEAS_ARTIFACT_DIR)await page.screenshot({path:`${process.env.IDEAS_ARTIFACT_DIR}/capture-1180-dark.png`});
  await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog',{name:'Discard changes?',exact:true}).count(),1);await page.getByRole('button',{name:'Keep editing'}).click();assert.equal(await page.locator('#idea-capture [name="title"]').inputValue(),'Synthetic capture');
  await page.getByRole('button',{name:'Create idea',exact:true}).click();await page.locator('.idea-form-error').filter({hasText:'could not be created'}).waitFor();
  await page.getByRole('button',{name:'Retry',exact:true}).click();await page.getByRole('heading',{name:'Synthetic capture',exact:true}).waitFor();
  assert.equal(requests.length,2);assert.deepEqual(requests[0],requests[1]);assert.match(requests[0].requestId,/^[a-f0-9]{32}$/);
  await page.getByRole('button',{name:'Edit',exact:true}).click();await page.locator('[name="summary"]').fill('Unsaved synthetic draft');
  await page.locator('#area-nav a').first().click();await page.getByRole('button',{name:'Keep editing'}).click();assert.equal(await page.locator('[name="summary"]').inputValue(),'Unsaved synthetic draft');
  await page.evaluate(()=>applyData({generatedAt:'2026-11-07',projects:[]}));assert.equal(await page.locator('[name="summary"]').inputValue(),'Unsaved synthetic draft');
  await page.locator('#area-nav a').first().click();await page.getByRole('button',{name:'Discard changes'}).click();await page.waitForFunction(()=>!document.querySelector('#view').hidden);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});

test('revision conflicts preserve draft; unchanged original and evidence are preserved in patches',async()=>{
 const {browser,page,requests,setConflict,holdWrites,errors}=await setup();try{
  await goIdeas(page);await page.locator('.idea-list a').first().click();await page.getByRole('button',{name:'Edit',exact:true}).click();
  await page.locator('[name="summary"]').fill('My synthetic draft');setConflict();await page.getByRole('button',{name:'Save changes'}).click();
  await page.getByRole('button',{name:'Discard draft and reload'}).waitFor();assert.equal(await page.evaluate(()=>document.activeElement.dataset.ideaAction),'rebase');assert.equal(await page.locator('[name="summary"]').inputValue(),'My synthetic draft');
  assert.equal(Object.hasOwn(requests[0].patch,'original'),false);
  assert.equal(Object.values(requests[0].patch.assessments).some(a=>Object.hasOwn(a,'reviewedAt')),false);
  await page.getByRole('button',{name:'Discard draft and reload'}).click();await page.getByRole('button',{name:'Keep editing'}).click();assert.equal(await page.locator('[name="summary"]').inputValue(),'My synthetic draft');
  await page.getByRole('button',{name:'Discard draft and reload'}).click();await page.getByRole('button',{name:'Discard changes'}).click();await page.waitForFunction(()=>document.querySelector('[name="title"]')?.value === 'Latest synthetic title');assert.equal(await page.locator('[name="title"]').inputValue(),'Latest synthetic title');
  await page.locator('#idea-edit-assessments > summary').click();await page.locator('[data-idea-assessment="acquisition"] > summary').click();
  await page.locator('[name="acquisition.judgment"]').selectOption('favorable');await page.getByRole('button',{name:'Save changes'}).click();assert.match(await page.locator('.idea-form-error').textContent(),/short reason and confidence/);
  await page.locator('[name="acquisition.reason"]').fill('A synthetic assumption');await page.locator('[name="acquisition.confidence"]').selectOption('low');
  const release=holdWrites();await page.getByRole('button',{name:'Save changes'}).click();await page.locator('#idea-edit[aria-busy="true"]').waitFor();
  assert.equal(await page.locator('[name="acquisition.reason"]').inputValue(),'A synthetic assumption');assert.equal(await page.getByRole('button',{name:'Save changes'}).isDisabled(),true);
  release();await page.getByRole('heading',{name:'Latest synthetic title',exact:true}).waitFor();
  assert.equal(requests.at(-1).revision,2);assert.deepEqual(requests.at(-1).patch.assessments.acquisition.evidence,[]);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});

test('responsive themes, phone dimension comparison, 200% layout and snapshot controls',async()=>{
 const {browser,page,errors}=await setup({snapshot:true});try{
  await goIdeas(page);assert.equal(await page.locator('[data-idea-action="capture"]').count(),0);
  const artifacts=process.env.IDEAS_ARTIFACT_DIR;if(artifacts)await mkdir(artifacts,{recursive:true});
  for(const width of [390,768,1180])for(const theme of ['light','dark']){
    await page.setViewportSize({width,height:900});await page.evaluate(t=>document.documentElement.classList.toggle('dark',t==='dark'),theme);await noOverflow(page);
    await page.evaluate(()=>scrollTo(0,0));await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    if(artifacts)await page.screenshot({path:`${artifacts}/list-${width}-${theme}.png`,fullPage:true});
  }
  await page.locator('[data-idea-select="idea-1"]').check();await page.locator('[data-idea-select="idea-2"]').check();await page.getByRole('button',{name:'Compare (2)',exact:true}).click();
  for(const width of [390,768,1180])for(const theme of ['light','dark']){
    await page.setViewportSize({width,height:900});await page.evaluate(t=>document.documentElement.classList.toggle('dark',t==='dark'),theme);await noOverflow(page);
    await page.evaluate(()=>scrollTo(0,0));await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    if(artifacts)await page.screenshot({path:`${artifacts}/compare-${width}-${theme}.png`,fullPage:true});
  }
  await page.setViewportSize({width:390,height:900});assert.equal(await page.locator('.idea-phone-overviews section').count(),2);
  await page.locator('[name="dimension"]').selectOption('6');assert.match(await page.locator('.idea-compare-phone').textContent(),/Unknown/);
  await page.locator('.idea-compare-phone a').first().click();assert.equal(await page.locator('[data-idea-action="edit"]').count(),0);
  for(const width of [390,768,1180])for(const theme of ['light','dark']){
    await page.setViewportSize({width,height:900});await page.evaluate(t=>document.documentElement.classList.toggle('dark',t==='dark'),theme);await noOverflow(page);
    await page.evaluate(()=>scrollTo(0,0));await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    if(artifacts)await page.screenshot({path:`${artifacts}/detail-${width}-${theme}.png`,fullPage:true});
  }
  // A 590px CSS viewport is the reflow width of an 1180px window at 200% browser zoom.
  await page.setViewportSize({width:590,height:450});await noOverflow(page);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
 const missing=await setup({snapshot:true,missing:true});try{await missing.page.locator('#area-nav a').nth(1).click();await missing.page.getByText('Ideas are not included in this snapshot.',{exact:true}).waitFor();assert.match(await missing.page.locator('#ideas-view').textContent(),/not included in this snapshot/);}finally{await missing.browser.close();}
});


test('refresh errors retain known content; evidence survives editing and project transitions are deliberate',async()=>{
 const {browser,page,requests,setFailure,errors}=await setup();try{
  await goIdeas(page);setFailure(true);
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await page.getByRole('button',{name:'Retry',exact:true}).waitFor();
  assert.equal(await page.locator('.idea-list tbody tr').count(),3);
  setFailure(false);await page.getByRole('button',{name:'Retry',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#idea-load-error .idea-error'));
  await page.locator('a[href="#/ideas/idea-2"]').click();await page.getByRole('heading',{name:'Keyword evidence',exact:true}).waitFor();
  assert.match(await page.locator('.idea-reading').textContent(),/Not measured/);
  assert.equal(await page.locator('.idea-reading .idea-scroll th[scope="row"]').first().evaluate(el=>getComputedStyle(el).textTransform),'none');
  await page.locator('[data-idea-disclosure="sources"] > summary').click();
  assert.equal(await page.locator('a[href="https://example.com/synthetic"]').first().getAttribute('rel'),'noopener noreferrer');
  await page.getByRole('button',{name:'Edit',exact:true}).click();
  await page.locator('#idea-edit-assessments > summary').click();await page.locator('[data-idea-assessment="acquisition"] > summary').click();
  await page.locator('[name="acquisition.reason"]').fill('Changed synthetic interpretation');
  await page.locator('[name="state"]').selectOption('building');await page.getByRole('button',{name:'Save changes'}).click();
  assert.match(await page.locator('.idea-form-error').textContent(),/Choose a registered project/);
  await page.locator('[name="projectId"]').selectOption('synthetic');await page.getByRole('button',{name:'Save changes'}).click();
  await page.getByRole('button',{name:'Edit',exact:true}).waitFor();
  const patch=requests.at(-1).patch;assert.deepEqual(patch.assessments.acquisition.evidence,['S1']);assert.deepEqual(patch.assessments.acquisition.counterevidence,[]);
  assert.equal(Object.hasOwn(patch,'sources'),false);assert.equal(Object.hasOwn(patch,'keywords'),false);
  await page.locator('[data-idea-project]').click();await page.waitForFunction(()=>!document.querySelector('#view').hidden);
  assert.equal(await page.evaluate(()=>state.project),'synthetic');assert.equal(await page.evaluate(()=>state.tab),'board');
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
 const failed=await setup({failure:true});try{
  await failed.page.locator('#area-nav a').nth(1).click();await failed.page.getByRole('button',{name:'Retry',exact:true}).waitFor();
  assert.match(await failed.page.locator('#ideas-view').textContent(),/Ideas could not be loaded/);assert.equal(await failed.page.locator('#view').isVisible(),false);
 }finally{await failed.browser.close();}
});

test('selection stays in place; evidence and return navigation retain focus',async()=>{
 const {browser,page,errors,changeRecord}=await setup();try{
  await goIdeas(page);
  for(const width of [390,1180]){
    await page.setViewportSize({width,height:900});
    const second=page.locator('[data-idea-select="idea-2"]');
    const before=(await second.boundingBox()).y;
    await page.locator('[data-idea-select="idea-1"]').check();
    assert.ok(Math.abs((await second.boundingBox()).y-before)<1);
    await page.getByRole('button',{name:'Clear',exact:true}).click();
  }
  await page.locator('[data-idea-select="idea-1"]').check();await page.locator('[data-idea-select="idea-2"]').check();
  changeRecord('idea-1',{summary:'Changed while selecting'});
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await page.getByText('Changed while selecting',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.ideaSelect),'idea-2');
  await page.getByRole('button',{name:'Compare (2)',exact:true}).click();
  for(const width of [390,1180]){
    await page.setViewportSize({width,height:900});
    const scope=width===390?'.idea-compare-phone':'.idea-compare-desktop';
    await page.locator(`${scope} [data-idea-action="evidence"]`).first().click();
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.ideaDimension),'acquisition');
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.ideaAction),'evidence');
    assert.equal(await page.locator(`${scope} [data-idea-action="evidence"]`).count(),1);
  }
  await page.locator('.idea-compare-desktop a').nth(1).click();
  await page.locator('[data-idea-disclosure="acquisition"] > summary').click();
  changeRecord('idea-2',{summary:'Updated research summary'});
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await page.getByText('Updated research summary',{exact:true}).waitFor();
  assert.equal(await page.locator('[data-idea-disclosure="acquisition"]').getAttribute('open'),'');
  assert.equal(await page.evaluate(()=>document.activeElement.closest('[data-idea-disclosure]')?.dataset.ideaDisclosure),'acquisition');
  await page.locator('#area-nav a').first().click();await page.locator('#area-nav a').nth(1).click();
  assert.match(page.url(),/#\/ideas\/idea-2$/);
  await page.getByRole('link',{name:'Back to Ideas',exact:true}).click();
  await page.locator('#idea-search').fill('Problem');
  changeRecord('idea-1',{summary:'Problem freshly researched'});
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await page.getByText('Problem freshly researched',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.activeElement.id),'idea-search');
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});

test('compact assessment edit and conflict rebase preserve local and upstream fields',async()=>{
 const {browser,page,errors,requests,setConflict,changeRecord}=await setup();try{
  await goIdeas(page);await page.locator('a[href="#/ideas/idea-1"]').click();
  await page.getByRole('button',{name:'Edit assessment',exact:true}).click();
  assert.equal(await page.evaluate(()=>document.activeElement.name),'acquisition.judgment');
  assert.equal(await page.locator('[name="acquisition.confidence"]').isDisabled(),true);
  assert.ok(await page.locator('#idea-edit input:visible, #idea-edit textarea:visible, #idea-edit select:visible').count()<15);
  if(process.env.IDEAS_ARTIFACT_DIR)await page.screenshot({path:`${process.env.IDEAS_ARTIFACT_DIR}/edit-assessment-1180-dark.png`,fullPage:true});
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.getByRole('button',{name:'Edit',exact:true}).click();
  await page.locator('[name="summary"]').fill('My local summary');await page.locator('[name="nextDecision"]').fill('My local next decision');
  changeRecord('idea-1',{summary:'Upstream summary',mvp:{scope:'New upstream scope',platform:'Native'}});
  setConflict();await page.getByRole('button',{name:'Save changes',exact:true}).click();
  await page.getByRole('button',{name:'Review latest with my edits',exact:true}).click();
  await page.locator('.idea-conflict').waitFor({timeout:3000}).catch(async error=>{throw new Error(error.message+'\n'+await page.locator('#ideas-view').innerText());});
  assert.equal(await page.locator('[name="summary"]').inputValue(),'My local summary');
  assert.equal(await page.locator('[name="nextDecision"]').inputValue(),'My local next decision');
  assert.equal(await page.locator('[name="title"]').inputValue(),'Latest synthetic title');
  assert.equal(await page.locator('[name="mvp.scope"]').inputValue(),'New upstream scope');
  assert.match(await page.locator('.idea-conflict').textContent(),/Upstream summary/);
  if(process.env.IDEAS_ARTIFACT_DIR)await page.screenshot({path:`${process.env.IDEAS_ARTIFACT_DIR}/conflict-review-1180-dark.png`,fullPage:true});
  await page.getByRole('button',{name:'Save changes',exact:true}).click();
  await page.getByRole('heading',{name:'Latest synthetic title',exact:true}).waitFor();
  assert.equal(requests.at(-1).revision,2);
  assert.equal(Object.hasOwn(requests.at(-1).patch,'title'),false);
  assert.equal(requests.at(-1).patch.summary,'My local summary');
  assert.equal(requests.at(-1).patch.nextDecision,'My local next decision');
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});

test('changing a validation dependency unblocks save; unknown confidence does not create false overlaps',async()=>{
 const {browser,page,requests,errors,setConflict}=await setup();try{
  await goIdeas(page);await page.locator('a[href="#/ideas/idea-1"]').click();
  await page.getByRole('button',{name:'Edit',exact:true}).click();
  await page.locator('[name="state"]').selectOption('building');await page.getByRole('button',{name:'Save changes',exact:true}).click();
  assert.equal(await page.locator('[name="projectId"]').getAttribute('aria-invalid'),'true');
  await page.locator('[name="state"]').selectOption('captured');await page.locator('[name="summary"]').fill('Kept after correcting state');
  await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('button',{name:'Edit',exact:true}).waitFor();
  assert.equal(Object.hasOwn(requests.at(-1).patch,'mvp'),false);
  await page.getByRole('button',{name:'Edit assessment',exact:true}).click();
  await page.locator('[name="acquisition.judgment"]').selectOption('favorable');await page.getByRole('button',{name:'Save changes',exact:true}).click();
  assert.equal(await page.locator('[name="acquisition.reason"]').getAttribute('aria-invalid'),'true');
  await page.locator('[name="acquisition.judgment"]').selectOption('unknown');await page.getByRole('button',{name:'Save changes',exact:true}).click();
  await page.getByRole('button',{name:'Edit assessment',exact:true}).click();
  await page.locator('[name="acquisition.judgment"]').selectOption('favorable');await page.locator('[name="acquisition.reason"]').fill('Local assumption');await page.locator('[name="acquisition.confidence"]').selectOption('low');
  setConflict();await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('button',{name:'Review latest with my edits',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[name="title"]')?.value==='Latest synthetic title');
  assert.equal(await page.locator('.idea-conflict').count(),0);
  assert.equal(await page.locator('[name="acquisition.confidence"]').inputValue(),'low');
  await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('button',{name:'Edit',exact:true}).waitFor();
  assert.equal(requests.at(-1).patch.assessments.acquisition.judgment,'favorable');
  await page.locator('#area-nav a').nth(1).click();await page.locator('.idea-list').waitFor();
  assert.match(page.url(),/#\/ideas$/);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});

test('fit sorting, majority coverage, separate confidence, overview links and difference matrix',async()=>{
 const {browser,page,errors,changeRecord}=await setup();try{
  const known=(confidence='low',count=7)=>Object.fromEntries(keys.map((k,n)=>[k,{judgment:n<count?'mixed':'unknown',confidence:n<count?confidence:null,reason:n<count?'Full reason remains readable through the end of this synthetic assessment.':'',rationale:'',evidence:[],counterevidence:[],nextQuestion:'',reviewedAt:null}]));
  changeRecord('idea-1',{assessments:known('low',7)});
  changeRecord('idea-2',{assessments:known('high',7)});
  changeRecord('idea-3',{assessments:known('low',2)});
  await goIdeas(page);await page.locator('[name="sort"]').selectOption('fit');
  assert.deepEqual(await page.locator('.idea-list tbody tr td:nth-child(2)>a').allTextContents(),['Synthetic opportunity 2','Synthetic opportunity 1','Synthetic opportunity 3']);
  assert.match(await page.locator('.idea-list tbody tr').nth(2).textContent(),/Partial.*2 of 7 assessed/s);
  await page.locator('a[href="#/ideas/idea-1"]').click();
  assert.match(await page.locator('.idea-overview').textContent(),/50\/100.*7 of 7 assessed/s);
  await page.locator('.idea-breakdown-row [data-idea-dimension="technical"]').click();
  assert.equal(await page.locator('[data-idea-disclosure="technical"]').getAttribute('open'),'');
  assert.equal(await page.evaluate(()=>document.activeElement.closest('details').dataset.ideaDisclosure),'technical');
  await page.getByRole('link',{name:'Back to Ideas',exact:true}).click();
  for(const id of ['idea-1','idea-2','idea-3'])await page.locator(`[data-idea-select="${id}"]`).check();
  await page.getByRole('button',{name:'Compare (3)',exact:true}).click();
  await page.locator('.idea-compare-desktop').waitFor();
  assert.deepEqual((await page.locator('.idea-compare-desktop tbody th').allTextContents()).slice(0,3),['Fit','Confidence','Next decision']);
  await page.locator('[name="differences"]').check();
  assert.equal(await page.locator('.idea-compare-desktop tbody tr').count(),11); // confidence differences count
  for(const theme of ['light','dark']){
   await page.evaluate(t=>document.documentElement.classList.toggle('dark',t==='dark'),theme);
   await page.setViewportSize({width:768,height:900});await noOverflow(page);
   await page.setViewportSize({width:390,height:844});await noOverflow(page);
   assert.equal(await page.locator('.idea-compare-phone [data-idea-action="remove"]').count(),3);
   await page.locator('.idea-matrix [data-idea-dimension="technical"]').click();
   assert.equal(await page.evaluate(()=>document.activeElement.name),'dimension');
   assert.equal(await page.locator('[name="dimension"]').inputValue(),'1');
   assert.match(await page.locator('#idea-focused-dimension').textContent(),/through the end/);
  }
  await page.setViewportSize({width:1180,height:900});
  changeRecord('idea-2',{assessments:known('low',7)});changeRecord('idea-3',{assessments:known('low',7)});
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await page.getByText('No differing assessments. 7 matching dimensions hidden.',{exact:true}).waitFor();
  assert.equal(await page.locator('.idea-compare-desktop tbody tr').count(),4);
  await page.locator('[name="differences"]').uncheck();assert.equal(await page.locator('.idea-compare-desktop tbody tr').count(),11);
  await page.evaluate(()=>location.hash='/ideas/compare?ids=idea-1,idea-missing');
  await page.getByRole('heading',{name:'Compare ideas',exact:true}).waitFor();
  await page.locator('[name="differences"]').check();assert.equal(await page.locator('.idea-compare-desktop tbody tr').count(),11);
  assert.match(await page.locator('.idea-compare-desktop').textContent(),/Idea unavailable/);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
