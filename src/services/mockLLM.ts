import type { LLMResult } from '../types';
import {topicDemoScenarios} from './topicDemos';

type DemoScenario = { id:string; title:string; question:string; result:LLMResult };

const samples: DemoScenario[] = [
 {
  id:'research', title:'Research methods',
  question:'Explain the main qualitative research methods used in HCI',
  result:{
   chatResponse:'Qualitative HCI research helps us understand people, their context, and their needs.\n\nInterviews explore participants’ experiences in their own words. Observation reveals what people do in real settings. Both methods can use field notes to capture context.\n\nThematic analysis identifies patterns across interview transcripts and observation notes. Together, these methods support user-centered design by grounding design decisions in evidence about people.',
   nodes:[
    {id:'interviews',label:'Interviews',summary:'A qualitative method for exploring participants’ experiences through conversation.',quote:'Interviews explore participants’ experiences in their own words.'},
    {id:'observation',label:'Observation',summary:'Studying people’s actions in their everyday context.',quote:'Observation reveals what people do in real settings.'},
    {id:'field-notes',label:'Field notes',summary:'Written records that capture actions, context, and reflections during research.',quote:'Both methods can use field notes to capture context.'},
    {id:'thematic-analysis',label:'Thematic analysis',summary:'A method for identifying patterns across qualitative research data.',quote:'Thematic analysis identifies patterns across interview transcripts and observation notes.'},
    {id:'user-centered-design',label:'User-centered design',summary:'An approach that grounds design decisions in evidence about people and their needs.',quote:'Together, these methods support user-centered design by grounding design decisions in evidence about people.'},
   ],
   edges:[
    {source:'interviews',target:'field-notes',relationship:'uses'},
    {source:'observation',target:'field-notes',relationship:'uses'},
    {source:'interviews',target:'thematic-analysis',relationship:'supports'},
    {source:'observation',target:'thematic-analysis',relationship:'supports'},
    {source:'thematic-analysis',target:'user-centered-design',relationship:'supports'},
   ],
  },
 },
 {
  id:'themes', title:'Thematic analysis',
  question:'How does thematic analysis connect interviews and observation?',
  result:{
   chatResponse:'Thematic analysis connects interviews and observation by looking for recurring patterns across both sources.\n\nCoding assigns short labels to meaningful passages or observed actions. Thematic analysis uses coding to organize this evidence into themes.\n\nAn affinity diagram groups related codes so researchers can compare patterns visually. Coding uses an affinity diagram to explore relationships before refining the final themes.\n\nIn the graph, interviews, observation, and thematic analysis are reused. Coding and the affinity diagram add new connections.',
   nodes:[
    {id:'thematic-analysis',label:'Thematic analysis',summary:'Finding recurring patterns across qualitative data sources.',quote:'Thematic analysis connects interviews and observation by looking for recurring patterns across both sources.'},
    {id:'interviews',label:'Interviews',summary:'Conversations that provide qualitative evidence.',quote:'Thematic analysis connects interviews and observation by looking for recurring patterns across both sources.'},
    {id:'observation',label:'Observation',summary:'Evidence gathered from people’s actions in context.',quote:'Thematic analysis connects interviews and observation by looking for recurring patterns across both sources.'},
    {id:'coding',label:'Coding',summary:'Assigning short, meaningful labels to passages or observed actions.',quote:'Coding assigns short labels to meaningful passages or observed actions.'},
    {id:'affinity-diagram',label:'Affinity diagram',summary:'A visual grouping of related codes to help researchers identify themes.',quote:'An affinity diagram groups related codes so researchers can compare patterns visually.'},
   ],
   edges:[
    {source:'interviews',target:'thematic-analysis',relationship:'supports'},
    {source:'observation',target:'thematic-analysis',relationship:'supports'},
    {source:'thematic-analysis',target:'coding',relationship:'uses'},
    {source:'coding',target:'affinity-diagram',relationship:'uses'},
    {source:'affinity-diagram',target:'thematic-analysis',relationship:'supports'},
   ],
  },
 },
 {
  id:'evaluation', title:'Compare evaluations',
  question:'Compare usability testing and heuristic evaluation',
  result:{
   chatResponse:'Usability testing and heuristic evaluation both support user-centered design, but they gather different kinds of evidence.\n\nUsability testing observes representative users attempting realistic tasks. It reveals where people struggle and why.\n\nHeuristic evaluation uses usability heuristics to guide an expert review of an interface. It can identify likely issues before recruiting participants.\n\nUsability heuristics are general principles, such as visibility of system status and consistency. Combining expert review with user testing helps a team compare predicted issues with observed difficulties.',
   nodes:[
    {id:'usability-testing',label:'Usability testing',summary:'Observing representative users as they attempt realistic tasks.',quote:'Usability testing observes representative users attempting realistic tasks.'},
    {id:'heuristic-evaluation',label:'Heuristic evaluation',summary:'An expert review of an interface against usability principles.',quote:'Heuristic evaluation uses usability heuristics to guide an expert review of an interface.'},
    {id:'usability-heuristics',label:'Usability heuristics',summary:'General principles used to reason about interface usability.',quote:'Usability heuristics are general principles, such as visibility of system status and consistency.'},
    {id:'user-centered-design',label:'User-centered design',summary:'An approach informed by evidence about users and their needs.',quote:'Usability testing and heuristic evaluation both support user-centered design, but they gather different kinds of evidence.'},
   ],
   edges:[
    {source:'usability-testing',target:'user-centered-design',relationship:'supports'},
    {source:'heuristic-evaluation',target:'user-centered-design',relationship:'supports'},
    {source:'heuristic-evaluation',target:'usability-heuristics',relationship:'uses'},
    {source:'usability-testing',target:'heuristic-evaluation',relationship:'relates_to'},
   ],
  },
 },
 {
  id:'activity', title:'Activity theory',
  question:'How does activity theory inform interaction design?',
  result:{
   chatResponse:'Activity theory examines how people pursue goals within social and material contexts.\n\nMediation explains how tools shape the relationship between people and their goals. Activity theory uses mediation to reason about an interaction beyond an individual screen.\n\nA prototype makes a proposed interaction tangible enough to examine in context. Mediation helps researchers reason about how a prototype changes an activity.\n\nActivity theory supports user-centered design by drawing attention to the wider context of use, including the tools and practices surrounding an interface.',
   nodes:[
    {id:'activity-theory',label:'Activity theory',summary:'A framework for understanding goal-directed activity in social and material contexts.',quote:'Activity theory examines how people pursue goals within social and material contexts.'},
    {id:'mediation',label:'Mediation',summary:'How tools shape the relationship between people and their goals.',quote:'Mediation explains how tools shape the relationship between people and their goals.'},
    {id:'prototype',label:'Prototype',summary:'A tangible representation of an interaction that can be examined in context.',quote:'A prototype makes a proposed interaction tangible enough to examine in context.'},
    {id:'user-centered-design',label:'User-centered design',summary:'An approach that considers users and their wider context of use.',quote:'Activity theory supports user-centered design by drawing attention to the wider context of use, including the tools and practices surrounding an interface.'},
   ],
   edges:[
    {source:'activity-theory',target:'mediation',relationship:'uses'},
    {source:'mediation',target:'prototype',relationship:'relates_to'},
    {source:'activity-theory',target:'user-centered-design',relationship:'supports'},
    {source:'prototype',target:'user-centered-design',relationship:'supports'},
   ],
  },
 },
];

// Each edge has its own supporting excerpt; shared endpoints alone are not evidence.
const edgeQuotes:Record<string,string[]>={
 research:[
  'Both methods can use field notes to capture context.',
  'Both methods can use field notes to capture context.',
  'Thematic analysis identifies patterns across interview transcripts and observation notes.',
  'Thematic analysis identifies patterns across interview transcripts and observation notes.',
  'Together, these methods support user-centered design by grounding design decisions in evidence about people.',
 ],
 themes:[
  'Thematic analysis connects interviews and observation by looking for recurring patterns across both sources.',
  'Thematic analysis connects interviews and observation by looking for recurring patterns across both sources.',
  'Thematic analysis uses coding to organize this evidence into themes.',
  'Coding uses an affinity diagram to explore relationships before refining the final themes.',
  'An affinity diagram groups related codes so researchers can compare patterns visually.',
 ],
 evaluation:[
  'Usability testing and heuristic evaluation both support user-centered design, but they gather different kinds of evidence.',
  'Usability testing and heuristic evaluation both support user-centered design, but they gather different kinds of evidence.',
  'Heuristic evaluation uses usability heuristics to guide an expert review of an interface.',
  'Combining expert review with user testing helps a team compare predicted issues with observed difficulties.',
 ],
 activity:[
  'Activity theory uses mediation to reason about an interaction beyond an individual screen.',
  'Mediation helps researchers reason about how a prototype changes an activity.',
  'Activity theory supports user-centered design by drawing attention to the wider context of use, including the tools and practices surrounding an interface.',
  'A prototype makes a proposed interaction tangible enough to examine in context.',
 ],
};
export const demoScenarios:DemoScenario[]=samples.map(sample=>({
 ...sample,result:{...sample.result,
  nodes:sample.result.nodes.map(node=>{
   const inPrompt=sample.question.toLowerCase().includes(node.label.toLowerCase());
   const evidence={source:inPrompt?'user' as const:'assistant' as const,quote:inPrompt?sample.question:node.quote};
   return {...node,quote:evidence.quote,evidence};
  }),
  edges:sample.result.edges.map((edge,index)=>({...edge,evidence:{source:'assistant' as const,quote:edgeQuotes[sample.id][index]}})),
 },
}));

export function getMockResult(question:string,existingNodes:{id:string;label:string}[]=[]):LLMResult {
 const text=question.toLowerCase();
 const allSamples=[...topicDemoScenarios,...demoScenarios];
 const scenario=allSamples.find(sample=>sample.question.toLowerCase()===text.trim())
  ?? topicDemoScenarios.find(sample=>sample.id===(/spaghetti/.test(text)?'spaghetti':/carameliz|onion/.test(text)?'onions':/burger/.test(text)?'burger':/python|async|await|coroutine/.test(text)?'python':/basketball|zone defense/.test(text)?'basketball':''))
  ?? demoScenarios.find(sample=>sample.id===(/thematic|coding|affinity/.test(text)?'themes':/usability|heuristic/.test(text)?'evaluation':/activity|mediation/.test(text)?'activity':/qualitative|research|interview|observation/.test(text)?'research':''));
 // Return an independent result so graph state can never mutate the fixture.
 if(scenario){
  const result=structuredClone(scenario.result);
  if(scenario.id==='spaghetti'&&existingNodes.some(node=>node.id==='make-a-burger')){
   result.edges.push({source:'make-spaghetti',target:'make-a-burger',relationship:'cooking',kind:'shared_topic'});
  }
  return result;
 }
 return {
  chatResponse:'This demo uses sample answers rather than a live model. Choose Make a burger, Make spaghetti, Caramelize onions, Coding: async/await, or Sports: zone defense below to build the graph. Click a topic to read its full answer. The onion recipe connects to the burger as an optional topping.',
  nodes:[],edges:[],
 };
}

export async function askMockLLM(
 history:{role:'user'|'assistant';content:string}[],
 existingNodes:{id:string;label:string}[],
 signal?:AbortSignal,
):Promise<LLMResult> {
 await new Promise<void>((resolve,reject)=>{
  if(signal?.aborted){reject(new DOMException('Aborted','AbortError'));return;}
  const abort=()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'));};
  const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},650);
  signal?.addEventListener('abort',abort,{once:true});
 });
 const question=[...history].reverse().find(message=>message.role==='user')?.content??'';
 return getMockResult(question,existingNodes);
}
