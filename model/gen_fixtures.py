"""Regenerate cqa-studio/src/model/__tests__/fixtures.json from cho_cqa_model.py.

Mirrors the TS test's scenarioInputs() knob overrides so the frozen Python
reference matches exactly what the TS engine computes. Production(dmAb/dt)-weighted
harvest, per-point Golgi CQAs, trajectory checkpoints at days 0/3/6/9/12.
"""
import sys, json, math
sys.path.insert(0, '.')
import numpy as np
import cho_cqa_model as m

GLYCO_KEYS = ['high_mannose', 'afucosylation', 'galactosylation', 'sialylation', 'G0F']
SCEN = ['baseline','low_strip','high_strip','Mn4x','gal_feed','fut8_kd','st6_up',
        'alkaline','low_growth','rich_feed','asn_low','do_low','temp_shift']

def scenario(name):
    p = m.default_params(); gp = m.golgi_params()
    Mn = 0.5; asn = 1.0; DO = 50.0; Tset = 37.0
    expr = {'MGAT':1.0,'B4GALT':1.0,'FUT8':1.0,'ST6GAL':1.0}
    if name=='low_strip': p['kLa_CO2']=0.06
    elif name=='high_strip': p['kLa_CO2']=0.25
    elif name=='Mn4x': Mn=2.0
    elif name=='gal_feed': p['Fgal']=0.15
    elif name=='fut8_kd': expr['FUT8']=0.3
    elif name=='st6_up': expr['ST6GAL']=4.0
    elif name=='alkaline': p['pH_set']=7.3; gp['pH_set']=7.3
    elif name=='low_growth': p['mu_max']=0.020; gp['mu_max']=0.020
    elif name=='rich_feed': p['Fglc']=0.5; p['Fgln']=0.10
    elif name=='asn_low': asn=0.2
    elif name=='do_low': DO=15.0
    elif name=='temp_shift': Tset=33.0
    return p, gp, Mn, asn, DO, Tset, expr

def run(name, days=13):
    p, gp, Mn, asn, DO, Tset, expr = scenario(name)
    tau_f = math.exp(-0.045*(Tset-37.0))
    gp = dict(gp); gp['tauG'] = gp['tauG']*tau_f
    sol = m.run_bioreactor(p, days=days); t = sol.t
    Xv,Glc,Gln,Lac,Amm,mAb,pCO2,V,Gal = sol.y
    n = len(t)
    cqaT = {k:[] for k in GLYCO_KEYS}
    traj = {'Xv':[],'pCO2':[],'day':[],'G0F':[],'galactosylation':[],
            'afucosylation':[],'high_mannose':[],'pH_golgi':[]}
    dmab = np.zeros(n); allc=[]
    for i in range(n):
        i0,i1 = max(0,i-1),min(n-1,i+1); dt=t[i1]-t[i0]
        # match TS engine mu: add mu_d, clamp to [0, mu_max]
        dln=math.log(max(Xv[i1],1e-3))-math.log(max(Xv[i0],1e-3))
        mu=min(max(dln/dt + p['mu_d'], 0.0), p['mu_max']) if dt>0 else 0.0
        st={'pCO2':pCO2[i],'Amm':Amm[i],'mu':mu,'Mn':Mn,
            'MGAT':expr['MGAT'],'B4GALT':expr['B4GALT'],'FUT8':expr['FUT8'],'ST6GAL':expr['ST6GAL'],
            **m.nucleotide_pools(Glc[i],Gln[i],Gal[i],asn_level=asn,DO=DO)}
        _,c = m.glycosylation_cqa(st, gp); allc.append(c)
        for k in GLYCO_KEYS: cqaT[k].append(float(c[k]))
        dmab[i]=max((mAb[i1]-mAb[i0])/dt,0.0)
    w = dmab/dmab.sum() if dmab.sum()>0 else np.ones(n)/n
    harvest = {k:float(np.dot(w,cqaT[k])) for k in GLYCO_KEYS}
    for d in [0,3,6,9,12]:
        ix=d*24
        traj['Xv'].append(float(Xv[ix])); traj['pCO2'].append(float(pCO2[ix])); traj['day'].append(float(d))
        traj['G0F'].append(float(allc[ix]['G0F'])); traj['galactosylation'].append(float(allc[ix]['galactosylation']))
        traj['afucosylation'].append(float(allc[ix]['afucosylation'])); traj['high_mannose'].append(float(allc[ix]['high_mannose']))
        traj['pH_golgi'].append(float(allc[ix]['pH_golgi']))
    return {'titer':float(mAb[-1]),'peakVCD':float(Xv.max()/1e0 if Xv.max()>1e3 else Xv.max()),
            'pCO2max':float(pCO2.max()),'harvest':harvest,'traj':traj}

if __name__=='__main__':
    # validate against existing baseline before overwriting
    import os
    fp='../cqa-studio/src/model/__tests__/fixtures.json'
    old=json.load(open(fp))
    b=run('baseline')
    ob=old['fixtures']['baseline']['harvest']
    print("baseline reproduce check (want ~ old):")
    for k in GLYCO_KEYS:
        print(f"  {k:16} new={b['harvest'][k]:.4f}  old={ob[k]:.4f}  d={abs(b['harvest'][k]-ob[k]):.4f}")
    print(f"  peakVCD new={b['peakVCD']:.3f} old={old['fixtures']['baseline']['peakVCD']:.3f}")
    assert abs(b['harvest']['galactosylation']-ob['galactosylation'])<1e-3, "baseline drift — generator not faithful"

    # regenerate all scenarios; report which harvests moved (ammonia coupling)
    out = {'bio_p':old['bio_p'],'gly_p':old['gly_p'],'fixtures':{}}
    print("\nscenario harvest deltas (new vs old galactosylation / sialylation):")
    for name in SCEN:
        r = run(name); out['fixtures'][name]=r
        o = old['fixtures'].get(name,{}).get('harvest',{})
        dg = r['harvest']['galactosylation']-o.get('galactosylation',r['harvest']['galactosylation'])
        ds = r['harvest']['sialylation']-o.get('sialylation',r['harvest']['sialylation'])
        flag = '  <-- moved (elevated Amm)' if (abs(dg)>0.05 or abs(ds)>0.05) else ''
        print(f"  {name:12} Gal {r['harvest']['galactosylation']:6.2f} (d{dg:+.2f})  Sia {r['harvest']['sialylation']:5.2f} (d{ds:+.2f}){flag}")
    json.dump(out, open(fp,'w'), indent=2)
    print(f"\nwrote {fp}")
