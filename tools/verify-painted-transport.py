#!/usr/bin/env python3
"""Verify frozen table identity and physical transport without changing data."""
import argparse,gzip,hashlib,json
from pathlib import Path

def digest(data):return hashlib.sha256(data).hexdigest()
def main():
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument('asset_root',type=Path)
 p.add_argument('--manifest',type=Path,required=True)
 p.add_argument('--asset-catalog',type=Path,required=True)
 a=p.parse_args();tables=json.loads(a.manifest.read_text());catalog=json.loads(a.asset_catalog.read_text())
 if catalog['missing']:raise ValueError('Unresolved frozen assets')
 total=0;rawtotal=0
 for d in tables:
  physical=d.get('transport',d);raw=(a.asset_root/physical['path'].lstrip('/')).read_bytes()
  if len(raw)!=physical['bytes'] or digest(raw)!=physical['sha256']:raise ValueError('Physical table binding differs: '+physical['path'])
  total+=len(raw)
  if 'transport' in d:
   if physical['encoding']!='gzip':raise ValueError('Unsupported table encoding')
   # Bounded stream prevents inflation beyond the accepted original descriptor.
   import io
   with gzip.GzipFile(fileobj=io.BytesIO(raw)) as f:
    raw=f.read(d['bytes']+1)
    if len(raw)!=d['bytes'] or f.read(1):raise ValueError('Inflated table byte bound differs')
  if len(raw)!=d['bytes'] or digest(raw)!=d['sha256']:raise ValueError('Original table identity differs: '+d['path'])
  rawtotal+=len(raw)
 unique={r['resolvedPath']:r for r in catalog['found']}
 for path,d in unique.items():
  raw=(a.asset_root/path.lstrip('/')).read_bytes()
  if len(raw)!=d['bytes'] or digest(raw)!=d['sha256']:raise ValueError('Frozen asset binding differs: '+path)
  total+=len(raw)
 print(json.dumps({'verified_table_count':len(tables),'verified_original_table_bytes':rawtotal,'verified_non_table_assets':len(unique),'published_physical_bytes':total,'raw_identity_preserved':True}))
if __name__=='__main__':main()
