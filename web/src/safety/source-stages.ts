import type {PoliceEvent, SourceStage} from './model';

/** Preserve stages that have no displayed scene; they never supply coordinates or counts. */
export function unplacedStages(event:PoliceEvent):SourceStage[] {
 const displayed=new Set(event.scene_locations?.flatMap(scene=>scene.incidents?.map(stage=>stage.incident_id)??[])??[]);
 return (event.incidents??event.source_incidents??[]).filter(stage=>!displayed.has(stage.incident_id));
}

