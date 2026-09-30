import json,re,struct,copy
import numpy as np
from pathlib import Path
import argparse
parser=argparse.ArgumentParser(description="Register decoded Open3Dmodel bones to the body envelope")
parser.add_argument("decoded", help="JSON meshes with name, pos and ix, decoded from the source GLB")
parser.add_argument("--output", default="public/models/skeleton.glb")
args=parser.parse_args()
meshes=json.load(open(args.decoded))
land={k:np.array(v) for k,v in json.load(open(Path(__file__).with_name("body-landmarks.json"))).items()}
def rotation(a,b):
 a=a/np.linalg.norm(a);b=b/np.linalg.norm(b);v=np.cross(a,b);c=a@b;k=np.array([[0,-v[2],v[1]],[v[2],0,-v[0]],[-v[1],v[0],0]]);return np.eye(3)+k+k@k/(1+c)
def segment(p,a,b,c,d,width=None):
 a,b,c,d=map(np.array,[a,b,c,d]);r=rotation(b-a,d-c);s=np.linalg.norm(d-c)/np.linalg.norm(b-a)
 # Scale longitudinally, preserve anatomical cross-section at body scale.
 ax=(b-a)/np.linalg.norm(b-a);v=p-a;t=(v@ax)[:,None]*ax;v=t*s+(v-t)*(width or min(s,6.6));return v@r.T+c
shoulder=[-.165,1.382,-.022];elbow=[-.225,1.104,-.04];wrist=[-.265,.861,.016];hip=[-.061,.865,-.017];knee=[-.078,.438,-.028];ankle=[-.081,.078,-.043]
def torso(p):
 q=p.copy();y=p[:,1];q[:,0]*=np.interp(y,[.8,1.,1.2,1.4,1.5,1.7],[7.5,7.3,6.5,6.7,6.5,6.5]);q[:,1]=np.interp(y,[.798,.865,1.104,1.382,1.50,1.60,1.705],[-.19,.214,1.69,3.357,4.12,4.77,5.45]);q[:,2]=p[:,2]*6.3+np.interp(y,[.8,1.1,1.3,1.382,1.50,1.60,1.705],[.24,.25,.29,.235,.35,.43,.43]);return q
out=[]
for m in meshes:
 name=m['name'];p=np.array(m['pos']).reshape(-1,3);n=name.lower();q=torso(p)
 if n.startswith('humerus'):q=segment(p,shoulder,elbow,land['r-shoulder'],land['r-elbow'])
 elif n.startswith(('radius','ulna')):q=segment(p,elbow,wrist,land['r-elbow'],land['r-hand'])
 elif n.startswith('femur'):q=segment(p,hip,knee,land['r-upper-leg'],land['r-knee'])
 elif n.startswith(('tibia','fibula')):q=segment(p,knee,ankle,land['r-knee'],land['r-ankle'])
 elif n.startswith('patella'):q=(p-knee)*6.5+land['r-knee']
 elif p[:,1].max()<.09 or 'of foot' in n or 'metatarsal' in n or 'cuneiform' in n:
  q=(p-np.array(ankle))*6.5+land['r-ankle'];q[:,2]= (p[:,2]+.043)*7.4+land['r-ankle'][2]
 elif 'finger' in n and 'foot' not in n or 'metacarpal' in n:
  digit=int(re.search(r'([1-5])(?:st|nd|d|rd|th)',n)[1]);a=p[p[:,1]>=np.quantile(p[:,1],.92)].mean(0);b=p[p[:,1]<=np.quantile(p[:,1],.08)].mean(0)
  if 'metacarpal' in n:
   c=land[f'r-finger-{digit}-1'] if digit==1 else land['r-hand']*.7+land[f'r-finger-{digit}-1']*.3
   d=land[f'r-finger-{digit}-{2 if digit==1 else 1}']
  else:
   part=3 if 'distal' in n else 2 if 'middle' in n or digit==1 else 1;c=land[f'r-finger-{digit}-{part}'];d=land[f'r-finger-{digit}-{part+1}']
  q=segment(p,a,b,c,d,5.0)
 elif re.match(r'^(capitate|hamate|lunate bone|pisiform|scaphoid|trapezium|trapezoid|triquetrum|sesamoid_bones_of_hand)\.r$', n):
  q=segment(p,wrist,[-.278,.773,.043],land['r-hand'],land['r-finger-3-1'],5.8)
 out.append({'name':name,'p':q,'ix':np.array(m['ix'],dtype=np.uint32)})
 if re.search(r'\.r\.?$',name):out.append({'name':re.sub(r'\.r\.?$','.l',name),'p':q*np.array([-1,1,1]),'ix':np.array(m['ix'],dtype=np.uint32).reshape(-1,3)[:,[0,2,1]].reshape(-1)})
# GLB: normals averaged over shared vertices, with original anatomical node names.
j={'asset':{'version':'2.0','generator':'Human body skeleton registration','copyright':'Open3Dmodel contributors / Open Anatomy lineage. Adapted under CC BY-SA 4.0. See /licenses/skeleton.md'},'scene':0,'scenes':[{'nodes':[]}],'nodes':[],'meshes':[],'accessors':[],'bufferViews':[],'buffers':[{'byteLength':0}],'materials':[{'name':'Ivory bone','pbrMetallicRoughness':{'baseColorFactor':[.82,.76,.63,1],'metallicFactor':0,'roughnessFactor':.7}}]};chunks=[];offset=0
def acc(a,kind,component,bounds=False):
 global offset
 a=np.ascontiguousarray(a);b=a.tobytes();view=len(j['bufferViews']);j['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(b)});chunks.append(b);offset+=len(b);i=len(j['accessors']);x={'bufferView':view,'componentType':component,'count':len(a),'type':kind}
 if bounds:x.update(min=a.min(0).tolist(),max=a.max(0).tolist())
 j['accessors'].append(x);return i
for m in out:
 p=m['p'].astype('<f4');ix=m['ix'].reshape(-1,3);v=p[ix];n=np.cross(v[:,1]-v[:,0],v[:,2]-v[:,0]);normal=np.zeros_like(p)
 for z in range(3):np.add.at(normal,ix[:,z],n)
 normal/=np.maximum(np.linalg.norm(normal,axis=1,keepdims=True),1e-9)
 pa=acc(p,'VEC3',5126,True);na=acc(normal,'VEC3',5126);ia=acc(ix.reshape(-1).astype('<u4'),'SCALAR',5125);k=len(j['nodes']);j['nodes'].append({'name':m['name'],'mesh':k});j['scenes'][0]['nodes'].append(k);j['meshes'].append({'primitives':[{'attributes':{'POSITION':pa,'NORMAL':na},'indices':ia,'material':0}]})
j['buffers'][0]['byteLength']=offset;js=json.dumps(j,separators=(',',':')).encode();js+=b' '*((-len(js))%4);bin=b''.join(chunks);glb=struct.pack('<III',0x46546c67,2,28+len(js)+len(bin))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(bin),0x004e4942)+bin
Path(args.output).write_bytes(glb)
print('Skeleton:',len(out),'named meshes,',len(glb),'bytes')
