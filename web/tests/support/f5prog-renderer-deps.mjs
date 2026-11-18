// Renderer module state that newer renderer closures reach, for suites that
// evaluate actual renderer closures over the shared reflection fixture
// (support/f3-reflection-bridge.mjs). Every value is evaluated from the
// renderer's own text in the fixture scope; nothing here substitutes a
// renderer function.
//
// - bindRendererBindings: module-level constants/closures that a fixture does
//   not define yet (e.g. root500 COLOUR_PROGRAM_ATTRIBUTES and
//   COLOUR_ASSEMBLY_AUTHORITY, named by every colour recipe).
// - installProgramGrantHandoff: root500/infill/church/delegated500 keep a
//   successor-generation program grant handoff (programGrantHandoff), Bremen
//   its candidate grant handoff (candidateGrantHandoff), each created by the
//   production createProgramGrantHandoff; releaseGPU and candidate
//   cancellation clear them. The shared setup installs a handoff for city,
//   Tier300 and delegated500 only.

/** Evaluates each named binding from the renderer text unless already defined. */
export async function bindRendererBindings(bridge,f,names){
 for(const name of names)if(f.values[name]===undefined)f.values[name]=await bridge.evaluate(bridge.binding(f.text,name),f.values);
}

/** Installs the renderer's actual program grant handoff (and its revision state). */
export async function installProgramGrantHandoff(bridge,f){
 const helpers=await bridge.productionHelpers('src/safety/render-runtime/program-grant-handoff.ts');
 f.values.createProgramGrantHandoff??=helpers.createProgramGrantHandoff;
 if(['root500','infill'].includes(f.provider))f.values.programHandoffRevision??=0;
 if(['church','delegated500'].includes(f.provider)&&!('grantHandoffGeneration' in f.values))f.values.grantHandoffGeneration=undefined;
 const names=['programGrantHandoff','candidateGrantHandoff'].filter(name=>new RegExp('\\bconst '+name+'=createProgramGrantHandoff\\b').test(f.text));
 await bindRendererBindings(bridge,f,names);
 return names.map(name=>f.values[name]);
}

/**
 * Church colour-program dependencies (the same installation as the church
 * fixture of church-infill-solar-depth): its actual prepared-source workspace
 * (sourceWorkspace, over the geometry store budget) with a fixture model paint
 * text and that text's production-measured bound, its actual grant handoff,
 * its module-owned immutable colour source authority and attribute list.
 */
export async function installChurchColourDependencies(bridge,f,{paint='fixture church paint'}={}){
 const shaderBudget=await bridge.productionHelpers('src/safety/render-runtime/shader-source-budget.ts'),prepared=await bridge.productionHelpers('src/safety/prepared-source.ts');
 const preparation=await bridge.productionHelpers('src/safety/render-runtime/program-preparation.ts'),current=await bridge.productionHelpers('src/painted/delegated500/safety/current-paint-program.ts');
 Object.assign(f.values,{createPreparedSourceWorkspace:prepared.createPreparedSourceWorkspace,getFacadePaintFragmentGLSL:()=>paint,describeFacadePaintSourceBounds:()=>shaderBudget.shaderSourceBounds(shaderBudget.shaderSourceParts`${paint}`)});
 f.values.sourceWorkspace=await bridge.evaluate(bridge.binding(f.text,'sourceWorkspace'),f.values);
 await installProgramGrantHandoff(bridge,f);
 f.values.clearProgramGrantHandoff=await bridge.evaluate(bridge.binding(f.text,'clearProgramGrantHandoff'),f.values);
 f.values.createProgramSourceAuthority??=preparation.createProgramSourceAuthority;f.values.specializeCurrentPaintFragment??=current.specializeCurrentPaintFragment;
 await bindRendererBindings(bridge,f,['churchColourSourceAuthority','colourAttributes']);
}
