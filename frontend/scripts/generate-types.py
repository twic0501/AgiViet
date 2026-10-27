"""Sinh kiểu từ các schema OpenAPI, không sửa nguồn API."""
from pathlib import Path
import yaml
ROOT=Path(__file__).resolve().parents[2]
spec=yaml.safe_load((ROOT/'docs/backend/openapi.yaml').read_text())
def convert(s):
 if '$ref' in s:return s['$ref'].split('/')[-1]
 if 'enum' in s:return ' | '.join('null' if x is None else repr(x) for x in s['enum'])
 if 'oneOf' in s:return ' | '.join(convert(x) for x in s['oneOf'])
 t=s.get('type')
 if isinstance(t,list):return ' | '.join(convert({**s,'type':x}) for x in t)
 if t=='array':return '('+convert(s.get('items',{}))+')[]'
 if t=='object':return '{ '+ '; '.join(k+('' if k in s.get('required',[]) else '?')+': '+convert(v) for k,v in s.get('properties',{}).items())+' }' if s.get('properties') else 'Record<string, unknown>'
 return {'integer':'number','number':'number','string':'string','boolean':'boolean','null':'null'}.get(t,'unknown')
output='// Sinh từ docs/backend/openapi.yaml bằng npm run types.\n'
for name,schema in spec['components']['schemas'].items():output+=f'export type {name} = {convert(schema)};\n'
(ROOT/'frontend/shared/api-types.d.ts').write_text(output)
