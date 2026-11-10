import {describe,expect,it} from 'vitest';
import {updateConcept,type ConceptEdits} from './nodeEdit';
import {mergeGraph} from './graphMerge';
import {demoScenarios} from '../services/mockLLM';

const edits:ConceptEdits={label:'Participant interviews',summary:'A revised research summary.',quote:'A researcher’s updated context.'};

describe('editing graph concepts',()=>{
 it('keeps references, dragged positions, and edits stable across later replies',()=>{
  const initial=mergeGraph([],[],demoScenarios[0].result,'first-reply');
  initial.nodes[0]={...initial.nodes[0],position:{x:725,y:-300},selected:true};
  const before=structuredClone(initial);
  const changed=updateConcept(initial.nodes,'interviews',edits);
  expect(initial).toEqual(before);
  expect(changed[0]).toMatchObject({id:'interviews',position:{x:725,y:-300},selected:true,data:{...edits,firstSeenMessageId:'first-reply'}});
  expect(changed[1]).toBe(initial.nodes[1]);
  const later=mergeGraph(changed,initial.edges,demoScenarios[1].result,'second-reply');
  expect(later.nodes.find(n=>n.id==='interviews')?.data).toMatchObject(edits);
  expect(later.nodes.find(n=>n.id==='interviews')?.position).toEqual({x:725,y:-300});
  expect(later.edges.some(e=>e.source==='interviews'&&e.target==='thematic-analysis')).toBe(true);
  expect(later.nodes.filter(n=>n.id==='interviews')).toHaveLength(1);
 });
 it('rejects a blank topic name while allowing empty optional details',()=>{
  const initial=mergeGraph([],[],demoScenarios[0].result,'first-reply');
  expect(()=>updateConcept(initial.nodes,'interviews',{...edits,label:'  '})).toThrow('name');
  const changed=updateConcept(initial.nodes,'interviews',{...edits,label:'  Interviews  ',summary:'',quote:''});
  expect(changed[0].data).toMatchObject({label:'Interviews',summary:'',quote:''});
 });
});
