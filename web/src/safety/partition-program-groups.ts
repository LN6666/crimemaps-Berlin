// A group is specific to the renderer, city, source and pruning mode. Each
// verified union is compiled with its full member set, including on a later
// source revision, so the per-vertex family still selects its material.
const grouped:Readonly<Partial<Record<string,readonly (readonly number[])[]>>>= {
 'bremen/bremen/base/1': [[1629, 1630, 1631, 1632, 1633, 1634, 1635]],
 'bremen/bremen/bremen-europahafenkopf70/0': [[46000, 46001, 46002, 46003, 46004, 46010, 46011, 46012, 46013, 46020, 46023, 46024]],
 'bremen/bremen/bremen-europahafenkopf70/1': [[46000, 46001, 46002, 46003, 46004, 46010, 46011, 46012, 46013, 46020, 46023, 46024]],
 'bremen/bremen/bremen-flemings70/0': [[46070, 46072]],
 'bremen/bremen/bremen-flemings70/1': [[46070, 46072]],
 'infill/essen/base/0': [[26052, 26054], [26101, 26102]],
 'infill/stuttgart/base/0': [[26803, 26804], [32001, 32002]],
 'root500/hamburg/base/1': [[100, 101, 102, 108, 109], [111, 112], [6471, 6472], [140, 141, 142, 143, 148, 149]],
 'root500/leipzig/base/0': [[4771, 4772, 4773], [4756, 4757]],
};

export function partitionProgramFamilies(provider:string, city:string, source:string, pruned:boolean,
 selected:readonly number[], baseSurface:boolean):readonly number[]{
 if(!baseSurface||!selected.length)return selected;
 const groups=grouped[provider+'/'+city+'/'+source+'/'+Number(pruned)];
 return groups?.find(members=>selected.every(family=>members.includes(family)))??selected;
}
