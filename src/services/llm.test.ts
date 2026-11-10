import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';

const result = {chatResponse:'A reply',nodes:[],edges:[]};
const history = [{role:'user' as const,content:'Explain HCI'}];
const success = (text=JSON.stringify(result),finishReason='stop') => ({
 choices:[{finish_reason:finishReason,message:{role:'assistant',content:text}}],
});
const response = (body:unknown,status=200) => new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});

beforeEach(() => {
 vi.resetModules();
 vi.stubEnv('VITE_OPENAI_API_KEY','test-openai-key');
 vi.stubEnv('VITE_OPENAI_MODEL','test-model');
});
afterEach(() => {
 vi.unstubAllEnvs();
 vi.unstubAllGlobals();
 vi.useRealTimers();
});

describe('OpenAI requests',() => {
 it('uses OpenAI authentication, conversation history, existing concepts, and a strict graph schema',async () => {
  const fetchMock=vi.fn().mockResolvedValue(response(success()));
  vi.stubGlobal('fetch',fetchMock);
  const {askLLM}=await import('./llm');
  const nodes=[{id:'hci',label:'HCI'}];
  expect(await askLLM([...history,{role:'assistant',content:'Earlier answer'},...history],nodes)).toMatchObject({chatResponse:'A reply',primaryTopicId:'explain-hci'});
  const [url,options]=fetchMock.mock.calls[0];
  expect(url).toBe('https://api.openai.com/v1/chat/completions');
  expect(new Headers(options.headers).get('authorization')).toBe('Bearer test-openai-key');
  expect(url).not.toContain('test-openai-key');
  const body=JSON.parse(options.body);
  expect(body.messages.map((turn:{role:string})=>turn.role)).toEqual(['system','user','assistant','user']);
  expect(body.messages[0].content).toContain(JSON.stringify(nodes));
  expect(body.response_format.type).toBe('json_schema');
  expect(body.response_format.json_schema.strict).toBe(true);
  expect(body.response_format.json_schema.schema.properties.nodes.items.required).toContain('evidence');
  expect(body.response_format.json_schema.schema.properties.edges.items.required).toContain('evidence');
  expect(body.model).toBe('test-model');
 });
 it('checks source evidence against the latest user message, not earlier context',async()=>{
  const grounded={chatResponse:'Here is your answer.',primaryTopic:{id:'hci',label:'HCI',summary:'The current topic.'},nodes:[
   {id:'hci',label:'HCI',summary:'The current topic.',evidence:{source:'user',quote:'HCI'}},
   {id:'old-topic',label:'Old topic',summary:'An old topic.',evidence:{source:'user',quote:'Old topic'}},
  ],edges:[]};
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response(success(JSON.stringify(grounded)))));
  const {askLLM}=await import('./llm');
  const result=await askLLM([{role:'user',content:'Old topic'},...history],[]);
  expect(result.nodes.map(node=>node.id)).toEqual(['hci']);
 });
 it('separates a new named subject when the model reuses the previous topic ID',async()=>{
  const output={chatResponse:'Boil spaghetti and toss it with tomato sauce.',primaryTopic:{id:'make-a-burger',label:'Make a burger',summary:'A spaghetti recipe.',focus:'spaghetti'},nodes:[],edges:[],topicLinks:[{target:'make-a-burger',topic:'cooking'}]};
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response(success(JSON.stringify(output)))));
  const {askLLM}=await import('./llm');
  const result=await askLLM([
   {role:'user',content:'How to make a burger'},
   {role:'assistant',content:'Here is a burger recipe.'},
   {role:'user',content:'how do i make spaghetti'},
  ],[{id:'make-a-burger',label:'Make a burger',question:'How to make a burger',focus:'burger'}]);
  expect(result.primaryTopicId).toBe('make-spaghetti');
  expect(result.edges[0]).toMatchObject({target:'make-a-burger',relationship:'cooking',kind:'shared_topic'});
 });
 it('caps conversation history at 20 messages plus the system prompt',async () => {
  const fetchMock=vi.fn().mockResolvedValue(response(success()));vi.stubGlobal('fetch',fetchMock);
  const {askLLM}=await import('./llm');
  const turns=Array.from({length:21},(_,i)=>({role:i%2?'assistant' as const:'user' as const,content:String(i)}));
  await askLLM(turns,[]);
  const contents=JSON.parse(fetchMock.mock.calls[0][1].body).messages.slice(1);
  expect(contents).toHaveLength(20);
  expect(contents[0]).toEqual({role:'assistant',content:'1'});
 });
 it('does not send a request without a key',async () => {
  vi.stubEnv('VITE_OPENAI_API_KEY','');const fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock);
  const {askLLM,hasApiKey}=await import('./llm');
  expect(hasApiKey).toBe(false);
  await expect(askLLM(history,[])).rejects.toThrow('VITE_OPENAI_API_KEY');
  expect(fetchMock).not.toHaveBeenCalled();
 });
 it.each([
  [400,'OpenAI rejected the request'],[401,'API key was rejected'],[403,'API key was rejected'],
  [404,'model is unavailable'],[429,'Rate limit or quota reached'],[500,"Couldn't reach the model"],
 ])('maps HTTP %s to a useful error',async (status,message) => {
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response({error:{}},status)));
  const {askLLM}=await import('./llm');await expect(askLLM(history,[])).rejects.toThrow(message);
 });
 it.each([success('{invalid'),success(JSON.stringify(result),'length'),success('', 'content_filter'),{choices:[]}])('rejects malformed, truncated, or blocked responses',async body => {
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response(body)));
  const {askLLM,LLMParseError}=await import('./llm');
  await expect(askLLM(history,[])).rejects.toThrow(LLMParseError);
 });
 it('maps network failures to a retryable error',async () => {
  vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
  const {askLLM}=await import('./llm');await expect(askLLM(history,[])).rejects.toThrow("Couldn't reach the model");
 });
 it('aborts the request after 45 seconds',async () => {
  vi.useFakeTimers();let requestSignal:AbortSignal|undefined;
  vi.stubGlobal('fetch',vi.fn((_url,options) => new Promise((_resolve,reject) => {
   requestSignal=options.signal;requestSignal!.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')));
  })));
  const {askLLM}=await import('./llm');
  const pending=expect(askLLM(history,[])).rejects.toThrow("Couldn't reach the model");
  await vi.advanceTimersByTimeAsync(45000);await pending;expect(requestSignal?.aborted).toBe(true);
 });
 it('forwards cancellation from Reset',async () => {
  const controller=new AbortController();let requestSignal:AbortSignal|undefined;
  let started!:()=>void;const requestStarted=new Promise<void>(resolve=>{started=resolve;});
  vi.stubGlobal('fetch',vi.fn((_url,options) => new Promise((_resolve,reject) => {
   requestSignal=options.signal;requestSignal!.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')));started();
  })));
  const {askLLM}=await import('./llm');
  const pending=expect(askLLM(history,[],controller.signal)).rejects.toThrow();
  await requestStarted;controller.abort();await pending;expect(requestSignal?.aborted).toBe(true);
 });
});
