import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {deriveFit, dimensions, createIdeasStore, template, exportMarkdown} from './ideas.mjs';
const assessments=(values,confidence='low')=>Object.fromEntries(dimensions.map((d,n)=>[d.key,{judgment:values[n] || 'unknown',confidence:values[n] ? confidence : null}]));
test('fit coverage gate, points, rounding and canonical dimensions',()=>{
 for(const [values,expected] of [[[],null],[['favorable','mixed'],null],[Array(3).fill('favorable'),null],[['favorable','favorable','mixed','unfavorable'],63],[Array(7).fill('favorable'),100],[Array(7).fill('unfavorable'),0],[['mixed','favorable','favorable','mixed','mixed','mixed','unfavorable'],57],[['mixed','unfavorable','mixed','mixed','mixed','mixed','unfavorable'],36]]){
  const a=assessments(values),before=structuredClone(a),fit=deriveFit(a);
  assert.equal(fit.value,expected);assert.equal(fit.assessed,values.length);assert.equal(fit.total,dimensions.length);assert.equal(fit.counts.unknown,dimensions.length-values.length);assert.deepEqual(a,before);
 }
 assert.equal(deriveFit({...assessments([]),extraneous:{judgment:'favorable'}}).assessed,0);
 assert.equal(deriveFit(assessments(['favorable','favorable','mixed','unfavorable'],'high')).value,63);
 assert.deepEqual(deriveFit(assessments(['mixed','mixed'])).confidence,{high:0,medium:0,low:2});
});
test('fit is read-only projection, absent from persisted records and rejected in updates',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'opc-fit-'));
 try{
  const store=createIdeasStore({root});const {idea}=await store.add({title:'Fit fixture'});
  const file=path.join(root,'ideas.json'),before=fs.readFileSync(file,'utf8');
  assert.equal(idea.fit.value,null);assert.equal(store.payload().ideas[0].fit.assessed,0);
  assert.equal(Object.hasOwn(template(idea),'fit'),false);
  await assert.rejects(store.update(idea.id,idea.revision,{fit:{value:100}}),/unknown/);
  assert.equal(fs.readFileSync(file,'utf8'),before);assert.equal(Object.hasOwn(JSON.parse(before).ideas[0],'fit'),false);
  assert.match(exportMarkdown(idea),/Fit: Not scored · 0 of 7 assessed/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
