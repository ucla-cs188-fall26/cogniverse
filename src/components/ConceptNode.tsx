import {memo} from 'react';
import {Handle,Position,type NodeProps} from '@xyflow/react';
import type {Concept} from '../types';
export const ConceptNode=memo(({data,selected}:NodeProps<Concept>)=><div className={`concept-card ${selected?'selected':''} ${data.isNew?'new-node':''}`}>
 <Handle type="target" position={Position.Top}/>
 <span className="topic-origin">{data.evidence?.source==='user'?'From your question':data.evidence?.source==='assistant'?'From the answer':'Topic'}</span>
 <strong title={data.label}>{data.label}</strong>
 {data.answers?.length?<span className="answer-count">{data.answers.length===1?'Answer inside':`${data.answers.length} answers inside`}</span>:null}
 <Handle type="source" position={Position.Bottom}/>
</div>);
