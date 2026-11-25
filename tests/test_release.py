"""Exercise the publishing script against a fake GitHub CLI (no network)."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'publish_release.sh'
GH_STUB = '''#!/usr/bin/env python3
import json,os,sys
from pathlib import Path
p=Path(os.environ['MOCK_STATE'])
d=json.loads(p.read_text())
a=sys.argv[1:]
def done(code=0, output=''):
    p.write_text(json.dumps(d))
    if output: print(output)
    sys.exit(code)
if a[0]=='api':
    if '-X' in a and 'POST' in a:
        d['tag_calls']+=1
        if d['tag_failures']>0:
            d['tag_failures']-=1
            done(1,'HTTP 500')
        d['tag']=os.environ['GITHUB_SHA']
        done()
    if d['tag'] is None: done(1,'Not Found')
    done(0,d['tag'])
if a[:2]==['release','view']:
    if d['release'] is None: done(1,'Release not found')
    if '--json' in a: done(0,'\\n'.join(d['assets']))
    done()
if a[:2]==['release','create']:
    d['create_calls']+=1
    if d['create_failures']>0:
        d['create_failures']-=1
        done(1,'HTTP 500')
    d['release']=True
    done()
if a[:2]==['release','upload']:
    d['upload_calls']+=1
    if d['upload_failures']>0:
        d['upload_failures']-=1
        done(1,'HTTP 500')
    d['assets']=['Snack_Dash.html','Snack_Dash_HTML.zip']
    done()
done(1,'Unknown command: '+str(a))
'''

class ReleasePublisherTests(unittest.TestCase):
    def run_release(self, overrides=None):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root/'dist').mkdir()
            (root/'dist'/'Snack_Dash.html').write_text('<html>SnackDash</html>')
            (root/'dist'/'Snack_Dash_HTML.zip').write_bytes(b'ZIP-content')
            bin_dir=root/'bin'
            bin_dir.mkdir()
            (bin_dir/'gh').write_text(GH_STUB)
            (bin_dir/'gh').chmod(0o755)
            (bin_dir/'sleep').write_text('#!/bin/sh\nexit 0\n')
            (bin_dir/'sleep').chmod(0o755)
            state={'tag':None,'tag_calls':0,'tag_failures':1,'release':None,
                   'create_calls':0,'create_failures':1,'upload_calls':0,
                   'upload_failures':1,'assets':[]}
            state.update(overrides or {})
            file=root/'state.json'
            file.write_text(json.dumps(state))
            env=dict(os.environ,MOCK_STATE=str(file),PATH=str(bin_dir)+os.pathsep+os.environ['PATH'],
                GH_TOKEN='test',GITHUB_SHA='abc123',GITHUB_REPOSITORY='erlinmm/SnackDash',
                GITHUB_EVENT_NAME='workflow_dispatch',RELEASE_TAG='v1.0.0')
            result=subprocess.run(['bash',str(SCRIPT)],cwd=root,env=env,capture_output=True,text=True,timeout=15)
            return result,json.loads(file.read_text())

    def test_retry_temporary_github_errors(self):
        process,state=self.run_release()
        self.assertEqual(process.returncode,0,process.stdout+process.stderr)
        self.assertEqual((state['tag_calls'],state['create_calls'],state['upload_calls']),(2,2,2))
        self.assertEqual(state['assets'],['Snack_Dash.html','Snack_Dash_HTML.zip'])

    def test_existing_tag_on_another_commit_is_rejected(self):
        process,state=self.run_release({'tag':'old-commit'})
        self.assertNotEqual(process.returncode,0)
        self.assertEqual(state['create_calls'],0)

    def test_permanent_500_fails_without_claiming_success(self):
        process,state=self.run_release({'create_failures':100,'tag_failures':0})
        self.assertNotEqual(process.returncode,0)
        self.assertEqual(state['create_calls'],4)
        self.assertEqual(state['upload_calls'],0)

if __name__=='__main__':
    unittest.main()
