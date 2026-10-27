/** Preserve the fully assembled material shader's depth/discard effects while
 * making its final RGB/alpha irrelevant to the depth-only target. This is NOT a
 * family selector: callers must supply the original complete caster fragment,
 * with all repair hooks and structural dispatches, before color specialization.
 * The driver may eliminate pure color work; source parsing cost is not removed. */
export function createSolarDepthFragment(source:string,output:'color'|'colour'='color'):string{
 if(typeof source!=='string'||source.length>3_000_000||!['color','colour'].includes(output))throw Error('Invalid solar depth fragment input');
 // Mask comments without moving any code offsets. The candidate uses a single
 // explicit vec4 output; unknown/multiple output interfaces are rejected.
 const masked=source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,s=>s.replace(/[^\n]/g,' '));
 if(!/^\s*#version\s+300\s+es\b/.test(masked)||/\bcmSolarOriginalMain\b/.test(masked))throw Error('Unsupported solar depth shader interface');
 if(new RegExp('^\\s*#\\s*define\\s+(?:main|'+output+')\\b','m').test(masked))throw Error('Macro-defined solar depth entry/output');
 const mains=[...masked.matchAll(/\bvoid\s+(main)\s*\(\s*(?:void\s*)?\)\s*\{/g)];
 if(mains.length!==1||[...masked.matchAll(/\bmain\s*\(/g)].length!==1)throw Error('Solar depth requires one explicit uncalled main');
 const declaration=new RegExp('\\bout\\s+vec4\\s+'+output+'\\s*;','g'),outputs=[...masked.matchAll(declaration)];
 if(outputs.length!==1)throw Error('Solar depth requires its exact vec4 color output');
 const outputStart=outputs[0].index!,mainStart=mains[0].index!;
 let braces=0,parens=0,outputCount=0,mainAtTop=false,outputAtTop=false;
 for(let at=0;at<masked.length;at++){
  if(at===outputStart)outputAtTop=braces===0&&parens===0;
  if(at===mainStart)mainAtTop=braces===0&&parens===0;
  if(!braces&&!parens&&masked.slice(at,at+3)==='out'&&!/\w/.test(masked[at-1]??'')&&!/\w/.test(masked[at+3]??''))outputCount++;
  const c=masked[at];if(c==='{')braces++;else if(c==='}')braces--;else if(c==='(')parens++;else if(c===')')parens--;
  if(braces<0||parens<0)throw Error('Unbalanced solar depth shader');
 }
 if(braces||parens||!mainAtTop||!outputAtTop||outputCount!==1)throw Error('Unsupported solar depth output or entry layout');
 const entry=mainStart+mains[0][0].indexOf('main');
 // Renaming only the sole function identifier leaves the complete old body and
 // every material function byte-identical. An old early return returns here;
 // discard still kills the fragment, and gl_FragDepth writes remain observable.
 // Unlike replacing individual assignments, this also preserves later reads of
 // the original output variable inside the old main/function call graph.
 return source.slice(0,entry)+'cmSolarOriginalMain'+source.slice(entry+4)+
  '\nvoid main(){cmSolarOriginalMain();'+output+'=vec4(1.);}\n';
}
