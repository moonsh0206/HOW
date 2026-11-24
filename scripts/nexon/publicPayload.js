// Decode only the two public statistics entries, never the rest of Nuxt state.
export function extractStatisticsPayload(text) {
  const table=JSON.parse(text);
  if(!Array.isArray(table)||table.length>20000)throw new Error('Unsupported public payload');
  const root=table.find(value=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.hasOwn(value,'hero-rate-list')&&Object.hasOwn(value,'hero-rate-filters'));
  if(!root)throw new Error('Statistics entries missing');
  function decode(index,depth=0){
    if(depth>30||!Number.isInteger(index)||index<0||index>=table.length)throw new Error('Invalid payload reference');
    const value=table[index];
    if(Array.isArray(value))return value.map(i=>decode(i,depth+1));
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,i])=>[key,decode(i,depth+1)]));
    return value;
  }
  return {filters:decode(root['hero-rate-filters']),statistics:decode(root['hero-rate-list'])};
}
