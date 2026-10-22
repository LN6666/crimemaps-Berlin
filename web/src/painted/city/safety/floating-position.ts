/** Keep a draggable card inside the visible viewport, with room for its shadow. */
export function floatingPosition(left:number,top:number,width:number,height:number,viewport:{left:number;top:number;width:number;height:number},margin=12){
 const x=viewport.left+margin,y=viewport.top+margin;
 return {left:Math.max(x,Math.min(left,viewport.left+viewport.width-margin-width)),top:Math.max(y,Math.min(top,viewport.top+viewport.height-margin-height))};
}
