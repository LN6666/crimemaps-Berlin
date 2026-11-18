import type {ShaderSourceBounds} from './render-runtime/shader-source-budget';
import type {ProgramPreparationBudget} from './render-runtime/program-preparation';

/** One complete pre-family fragment recipe. Inputs must describe every
 * source-affecting helper/material/pruning choice; family values stay separate.
 * The builder is called only inside admitted source preparation, never here. */
export type PreparedSourceRecipe = {
 readonly sourceKey: string;
 readonly inputs: readonly unknown[];
 /** Describes the real raw/assembly recipe without calling assemble for size. */
 readonly sourceBounds?: ShaderSourceBounds;
 readonly assemble: (paintSource: string) => string;
};

export type PreparedSourceResult = Readonly<{fragment: string; depthEffects: boolean}>;

/** Scalar diagnostics only: neither model values nor source text escape here. */
export type PreparedSourceStats = Readonly<{
 builds: number;
 analyses: number;
 hits: number;
 replacements: number;
 clears: number;
 sourceCharacters: number;
 released: boolean;
 budget:Readonly<{
  accounting:'logical-shader-workspace-estimate'|'unmetered';physicalMemory:'unmeasured';
  ownedBytesEstimate:number|null;sourceBytesEstimate:number|null;entryMetadataBytesEstimate:number|null;analysisBytesEstimate:number|null;scratchBytesEstimate:number|null;
  retiringBytesEstimate:number;policy:string|null;authorityTrace:readonly string[];authorityTraceTruncated:boolean;
 }>;
}>;

/** Owned by exactly one prepared plan. It retains at most its current recipe's
 * full fragment and reusable analysis, with no cache of specialized outputs. */
export interface PreparedSourceOwner {
 prepareSource(recipe: PreparedSourceRecipe, families: readonly number[]): PreparedSourceResult;
 /** Preflight uses the same workspace identities as its later actual claim. */
 programBudget?(recipe:PreparedSourceRecipe,vertexSource:string,attributes:readonly string[],families?:readonly number[]):ProgramPreparationBudget;
 /** Ends the current preparation working set; valid scope data remains owned
  * by the existing caller and can rebuild a later demand. */
 clearPreparedSource(): void;
 readonly preparedSourceStats: PreparedSourceStats;
 /** Terminal: deferred builders and their working set can no longer be used. */
 release(): void;
}
