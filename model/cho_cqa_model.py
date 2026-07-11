"""
Mechanistic CHO fed-batch -> Golgi N-glycosylation -> antibody glycan CQA model.

Couples:
  bioreactor ODEs (growth, glucose/glutamine, lactate/ammonia, CO2, product)
  -> dissolved pCO2 -> Golgi pH -> pH-dependent glycosyltransferase activity
  -> Golgi enzyme network (MGAT/B4GALT/ST6GAL + FUT8) over a growth-dependent
     residence time -> glycan distribution -> CQA rollup.

Parameters are literature-directed and calibrated to reproduce canonical CHO
fed-batch behaviour and established glycosylation responses. Educational use.
This is the validated reference for the JavaScript engine in cqa_explorer.html
(RK4 at 1-h steps reproduces LSODA to <0.15%).
"""
import numpy as np
from scipy.integrate import solve_ivp

def michaelis(S, K): return S / (K + S)
def feed(t, p):      return 1.0 if t >= p["feed_start"] else 0.0

def default_params():
    return dict(
        mu_max=0.0265, mu_d=0.0018, Kglc=0.6, Kgln=0.12,
        KIlac=38.0, KIamm=14.0, KICO2=95.0, pCO2_tox=125.0,
        pH_opt=7.05, pH_sig=0.28, pH_set=7.05, kpH_CO2=0.22,
        qglc=0.016, qgln=0.0030, Ylac_glc=0.90, klac_up=0.012,
        Yamm_gln=0.55, kgln_deg=0.0035, m_resp=0.004,
        kCO2_prod=14.0, kLa_CO2=0.11, pCO2_strip=30.0,
        qmab=2.4, a_nongrowth=0.55, kd_CO2=0.0006, kd_amm=0.0022,
        Fglc=0.20, Fgln=0.035, Fgal=0.0, feed_start=3.0,
        Vfeed_rate=0.003, kgal_up=0.004, Gal0=0.0)

def golgi_params():
    return dict(pH_set=7.05, tauG=40.0, ktau_mu=1.0, mu_max=0.0265,
        k_gnt=0.32, k_gal=0.052, gal2_rel=0.42, k_fut=0.205, k_sia=0.024,
        K_glcnac=0.5, K_gal=0.5, K_fuc=0.5, K_neu=0.5, KMn=0.5)

def bioreactor_rhs(t, y, p):
    Xv,Glc,Gln,Lac,Amm,mAb,pCO2,V,Gal = y
    Xv=max(Xv,0);Glc=max(Glc,0);Gln=max(Gln,0);Lac=max(Lac,0);Amm=max(Amm,0);pCO2=max(pCO2,0)
    f=feed(t,p); pH=p["pH_set"]-p["kpH_CO2"]*(pCO2-40)/40
    mu=(p["mu_max"]*michaelis(Glc,p["Kglc"])*michaelis(Gln,p["Kgln"])
        *p["KIlac"]/(p["KIlac"]+Lac)*p["KIamm"]/(p["KIamm"]+Amm)
        *p["KICO2"]/(p["KICO2"]+max(pCO2-40,0)))
    mu*=np.exp(-((pH-p["pH_opt"])**2)/(2*p["pH_sig"]**2))
    mud=p["mu_d"]+p["kd_CO2"]*max(pCO2-p["pCO2_tox"],0)+p["kd_amm"]*max(Amm-5,0)
    qglc=p["qglc"]*michaelis(Glc,p["Kglc"]); qgln=p["qgln"]*michaelis(Gln,p["Kgln"])
    return [(mu-mud)*Xv, -qglc*Xv+p["Fglc"]*f, -qgln*Xv+p["Fgln"]*f-p["kgln_deg"]*Gln,
            p["Ylac_glc"]*qglc*Xv-p["klac_up"]*Lac*Xv*(Glc<1.5),
            p["Yamm_gln"]*qgln*Xv+p["kgln_deg"]*Gln-0.0015*Amm,
            p["qmab"]*(p["a_nongrowth"]+(mu/p["mu_max"])*(1-p["a_nongrowth"]))*Xv,
            p["kCO2_prod"]*(mu+p["m_resp"])*Xv-p["kLa_CO2"]*(pCO2-p["pCO2_strip"]),
            f*p["Vfeed_rate"], p["Fgal"]*f-p["kgal_up"]*Gal*Xv]

def run_bioreactor(p, days=13):
    y0=[0.4,7.0,4.5,0,0,0,40.0,1.0,p.get("Gal0",0.0)]
    return solve_ivp(bioreactor_rhs,[0,days*24],y0,args=(p,),
        t_eval=np.linspace(0,days*24,days*24+1),method="LSODA",rtol=1e-6,atol=1e-8)

def golgi_pH(pCO2,pH_set,Amm=0.0):
    # Golgi lumen pH: acidified below bulk (offset), further acidified by dissolved CO2,
    # and ALKALINIZED by elevated ammonia (Villiger 2016 Part II, Henderson-Hasselbalch:
    # NH3 diffuses in and raises luminal pH, depressing the transferases -> less galactose;
    # Part I shows high ammonia -> nearly nongalactosylated glycans). Anchored at 8.5 mM
    # (just above the baseline ammonia peak ~8.1) so the calibrated baseline is unchanged;
    # only ELEVATED ammonia lifts pH. Saturating, capped at +0.9 pH (Villiger's 30 mM range).
    d_amm=0.9*(1.0-np.exp(-max(Amm-8.5,0.0)/12.0))
    return (pH_set-0.55)-0.0045*max(pCO2-40,0)+d_amm
def enz_pH_factor(pH,opt,sig=0.75): return np.exp(-((pH-opt)**2)/(2*sig**2))

def glycosylation_cqa(state, p):
    pH=golgi_pH(state["pCO2"],p["pH_set"],state.get("Amm",0.0)); tau=p["tauG"]/(1+p["ktau_mu"]*state["mu"]/p["mu_max"])
    cofMn=0.4+0.6*michaelis(state["Mn"],p["KMn"])
    act=lambda b,e,o,s,K,c=1.0: b*e*enz_pH_factor(pH,o)*michaelis(s,K)*c
    a_gnt=act(p["k_gnt"],state["MGAT"],6.5,state["UDPGlcNAc"],p["K_glcnac"],cofMn)
    a_gal1=act(p["k_gal"],state["B4GALT"],6.4,state["UDPGal"],p["K_gal"],cofMn)
    a_gal2=a_gal1*p["gal2_rel"]; a_fut=act(p["k_fut"],state["FUT8"],6.7,state["GDPFuc"],p["K_fuc"])
    a_sia=act(p["k_sia"],state["ST6GAL"],6.2,state["CMPNeuAc"],p["K_neu"],cofMn)
    f=lambda a:1-np.exp(-a*tau)
    p_gnt,p_gal1,p_gal2,p_fut,p_sia=f(a_gnt),f(a_gal1),f(a_gal2),f(a_fut),f(a_sia)
    Man5=1-p_gnt; proc=p_gnt; G0=proc*(1-p_gal1); G1=proc*p_gal1*(1-p_gal2)
    G2=proc*p_gal1*p_gal2; G2S=G2*p_sia; G2-=G2S; fuc=p_fut
    g={"Man5":Man5,"G0":G0*(1-fuc),"G0F":G0*fuc,"G1":G1*(1-fuc),"G1F":G1*fuc,
       "G2":G2*(1-fuc),"G2F":G2*fuc,"G2S":G2S*(1-fuc),"G2FS":G2S*fuc}
    tot=sum(g.values()); g={k:v/tot for k,v in g.items()}
    fucf=g["G0F"]+g["G1F"]+g["G2F"]+g["G2FS"]
    return g, dict(high_mannose=100*g["Man5"], afucosylation=100*(1-fucf),
        galactosylation=100*(g["G1"]+g["G1F"]+g["G2"]+g["G2F"]+g["G2S"]+g["G2FS"]),
        sialylation=100*(g["G2S"]+g["G2FS"]), G0F=100*g["G0F"], pH_golgi=pH, tau=tau)

def nucleotide_pools(Glc,Gln,Gal_ext,asn_level=1.0,DO=50.0):
    """Rate-limiting nucleotide-sugar precursor supply, normalized to 1.0 at the
    baseline operating point (Glc~27, Gln~4, asn replete, DO 50%).

    Michaelis constants sit in the culture operating range so feed / amino-acid /
    DO changes propagate to the glycan CQAs (they were saturated in the earlier
    version, which made feed effectively inert).
      - UDP-GlcNAc : hexosamine pathway = hexose (F6P) x amino donor (Gln + Asn)
      - UDP-Gal    : UDP-Glc epimerization (hexose) + galactose feed
      - GDP-Fuc    : GDP-mannose pathway (hexose)
      - CMP-NeuAc  : from UDP-GlcNAc, with O2-dependent oxidative steps
    """
    Km_glc,Km_gln=22.0,3.5
    fglc=michaelis(Glc,Km_glc); fgln=michaelis(Gln,Km_gln)
    amino=0.5*fgln+0.5*asn_level
    doF=michaelis(DO,20.0)
    raw=dict(UDPGlcNAc=fglc*amino, UDPGal=fglc*1.0+0.5*Gal_ext, GDPFuc=fglc,
             CMPNeuAc=fglc*amino*doF)
    ref=_nuc_ref()
    return {k:max(raw[k]/ref[k],0.03) for k in raw}

def _nuc_ref():
    # supply at baseline operating point (asn replete, DO 50, no gal feed)
    Km_glc,Km_gln=22.0,3.5; Glc0,Gln0=27.4,3.95
    fglc=michaelis(Glc0,Km_glc); fgln=michaelis(Gln0,Km_gln)
    amino=0.5*fgln+0.5*1.0; doF=michaelis(50.0,20.0)
    return dict(UDPGlcNAc=fglc*amino, UDPGal=fglc*1.0, GDPFuc=fglc, CMPNeuAc=fglc*amino*doF)

if __name__=="__main__":
    bp=default_params(); gp=golgi_params(); sol=run_bioreactor(bp)
    print("titer %.0f mg/L, peak VCD %.1fe6"%(sol.y[5][-1],sol.y[0].max()))
