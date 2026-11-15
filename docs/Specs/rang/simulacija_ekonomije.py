"""Simulacija ekonomije lige (SPEC_RANG §4). Pokretanje: python3 docs/Specs/rang/simulacija_ekonomije.py
Sve brojke su u CFG; pretpostavke o igračima (klase A–E, vještina) su hipoteze, ne mjerenje."""
import random, statistics as st, sys, json
from collections import Counter, defaultdict

CFG = dict(
  leagues=["Sedmica","Desetka","Žandar","Dama","Kralj","As"],
  floors=[0,10,70,170,400,700],
  win={21:10, 11:6},
  loss={21:[2,2,0,-3,-7,-10], 11:[1,1,0,-2,-4,-6]},
  abandon=[0,0,0,-3,-7,-10],
  first_win_day=5, weekly_goal_n=3, weekly_goal_pts=10, comeback_days=3, comeback_pts=5,
  season_days=28, compress_from=3,
  bots={1:-72, 2:0, 3:36}, f11=0.75,
  start_r=-30, K=[(10,16),(30,10),(10**9,6)],
  onboarding=[(5,[1]),(15,[1,2])], pity_losses=3,
  bot_share=0.9, p21=0.7,
)
def pwin(d,t): return 1/(1+10**(-(d*(1 if t==21 else CFG['f11']))/400))
def K(n):
  for lim,k in CFG['K']:
    if n<lim: return k

class P:
  def __init__(s,cls,rng):
    s.cls=cls; s.skill=rng.gauss(-30,50)+(20 if cls=='E' else 0)
    s.r=CFG['start_r']; s.n=0; s.pts=0; s.lg=0; s.best=0
    s.wins=0; s.done=0; s.lstreak=0; s.lastday=None; s.lastwin=None; s.week=None; s.wk_n=0; s.wk_claim=False
    s.reach={0:0}; s.season=0; s.hist=[]; s.promos_per_season=defaultdict(int)
def schedule(cls,rng):
  d=defaultdict(int)
  if cls=='A': d[0]=min(6,1+int(rng.expovariate(1/1.2)))
  elif cls=='B':
    d[0]=rng.randint(2,3)
    for _ in range(rng.randint(2,3)): d[rng.randint(1,6)]+=2
  elif cls=='C':
    d[0]+=2
    for w in range(4):
      for _ in range(2): d[w*7+rng.randint(0,6)]+=rng.randint(1,3)
  elif cls=='D':
    for w in range(12):
      a=w*7+rng.randint(0,6); d[a]+=2; d[w*7+rng.randint(0,6)]+=1
    d[0]=max(d[0],2)
  else:
    for w in range(12):
      for day in range(7):
        if rng.random()<0.9: d[w*7+day]+=rng.randint(4,9)
  return d
ABAND={'A':0.25,'B':0.18,'C':0.12,'D':0.08,'E':0.06}
def rollover(p,day):
  s=day//CFG['season_days']
  while p.season<s:
    p.hist.append(p.lg)
    if p.lg>=CFG['compress_from']:
      p.lg-=1; p.pts=CFG['floors'][p.lg]
    p.season+=1
def play(p,day,rng,dda=True):
  rollover(p,day)
  wk=day//7
  if p.week!=wk: p.week=wk; p.wk_n=0; p.wk_claim=False
  t=21 if rng.random()<CFG['p21'] else 11
  if rng.random()<CFG['bot_share']:
    if not dda: tier=2
    else:
      tier=None
      for lim,ts in CFG['onboarding']:
        if p.n<lim: tier=rng.choice(ts); break
      if tier is None:
        tier=min(CFG['bots'],key=lambda k:abs(CFG['bots'][k]-p.r))
      if p.lstreak>=CFG['pity_losses']: tier=1
    opp=CFG['bots'][tier]; oppr=opp
  else:
    opp=rng.gauss(-30,50); oppr=opp+rng.gauss(0,30)
  aband=rng.random()<ABAND[p.cls]
  win=(not aband) and rng.random()<pwin(p.skill-opp,t)
  e=pwin(p.r-oppr,t)
  if not aband: p.r+=K(p.n)*((1 if win else 0)-e)
  p.n+=1
  d=0
  if p.lastday is not None and day-p.lastday>=CFG['comeback_days'] and not aband: d+=CFG['comeback_pts']
  if aband: d+=CFG['abandon'][p.lg]; p.lstreak+=1
  else:
    p.done+=1; p.wk_n+=1
    if win:
      d+=CFG['win'][t]; p.wins+=1; p.lstreak=0
      if p.lastwin!=day: d+=CFG['first_win_day']; p.lastwin=day
    else: d+=CFG['loss'][t][p.lg]; p.lstreak+=1
    if p.wk_n>=CFG['weekly_goal_n'] and not p.wk_claim: d+=CFG['weekly_goal_pts']; p.wk_claim=True
  p.lastday=day
  p.pts=max(CFG['floors'][p.lg],p.pts+d)
  while p.lg<5 and p.pts>=CFG['floors'][p.lg+1]:
    p.lg+=1; p.promos_per_season[p.season]+=1
    if p.lg>p.best: p.best=p.lg; p.reach[p.lg]=p.n

def run(seed=1,dda=True,N=1000):
  rng=random.Random(seed)
  ps=[]
  for i in range(N):
    x=i/N; cls='A' if x<.70 else 'B' if x<.88 else 'C' if x<.95 else 'D' if x<.99 else 'E'
    p=P(cls,rng); p.sch=schedule(cls,rng); ps.append(p)
  snaps={}
  for day in range(84):
    for p in ps:
      for _ in range(p.sch.get(day,0)): play(p,day,rng,dda)
    if day+1 in (7,28,56,84):
      # stanje PRIJE presjeka sezone
      snaps[day+1]=[(p.cls,p.lg,p.pts,p.sch and any(p.sch.get(d,0) for d in range(day-6,day+1)),p.r,p.skill,p.n) for p in ps]
  return ps,snaps
def dist(rows,flt=lambda r:True):
  c=Counter(r[1] for r in rows if flt(r)); n=sum(c.values()) or 1
  return n,[round(100*c.get(i,0)/n,1) for i in range(6)]
ps,snaps=run(dda=True)
print("LIGE:",CFG['leagues'],CFG['floors'])
for d in (7,28,84):
  n,x=dist(snaps[d]); print(f"dan {d:2d} svi ({n}):",x)
  n,x=dist(snaps[d],lambda r:r[3]); print(f"       aktivni te sedmice ({n}):",x)
for d in (28,56,84):
  n,x=dist(snaps[d],lambda r:r[0] in 'DE'); print(f"kraj sezone dan {d} klase D+E ({n}):",x)
print("partija do lige (medijan / p25–p75, n igrača):")
for l in range(1,6):
  v=sorted(p.reach[l] for p in ps if l in p.reach)
  if v: print(f"  {CFG['leagues'][l]:8s} n={len(v):4d} med={v[len(v)//2]:4d} p25={v[len(v)//4]} p75={v[3*len(v)//4]}")
for cls in 'ABCDE':
  g=[p for p in ps if p.cls==cls]
  print(cls,"n",len(g),"partija med",st.median(p.n for p in g),"winrate",round(sum(p.wins for p in g)/max(1,sum(p.done for p in g)),3),"najviša liga",dict(sorted(Counter(p.best for p in g).items())))
# igrač 3 partije sedmično: prosječna putanja klase D
D=[p for p in ps if p.cls=='D']
print("klasa D kraj sezona (liga prije presjeka):",[dict(sorted(Counter(p.hist[i] if i<len(p.hist) else p.lg for p in D).items())) for i in range(3)])
print("klasa D unapređenja po sezoni (prosjek):",[round(st.mean(p.promos_per_season[s] for p in D),2) for s in range(3)])
E=[p for p in ps if p.cls=='E']
print("klasa E kraj sezona:",[dict(sorted(Counter(p.hist[i] if i<len(p.hist) else p.lg for p in E).items())) for i in range(3)])
print("klasa E pts:",[round(p.pts) for p in E], "skill",[round(p.skill) for p in E])
# skriveni rejting: greška
for lo,hi in ((1,5),(5,15),(15,40),(40,150),(150,10**6)):
  g=[p for p in ps if lo<=p.n<hi]
  if g: print(f"skriveni rejting n∈[{lo},{hi}) igrača {len(g)}: sr. (procjena−stvarno) {st.mean(p.r-p.skill for p in g):+.0f}, RMSE {st.mean((p.r-p.skill)**2 for p in g)**.5:.0f}, sd stvarne vještine {st.pstdev(p.skill for p in g):.0f}")
for dda in (True,False):
  ps2,_=run(seed=2,dda=dda)
  for cls in 'ABDE':
    g=[p for p in ps2 if p.cls==cls]; first=[p for p in g]
    print("DDA" if dda else "T2 ", cls, "winrate", round(sum(p.wins for p in g)/max(1,sum(p.done for p in g)),3))

print("--- kitovi, 5 sjemena: liga na kraju sezona 1,2,3")
for seed in range(3,8):
  ps3,_=run(seed=seed)
  E=[p for p in ps3 if p.cls=='E']
  print(seed,[dict(sorted(Counter(p.hist[i] if i<len(p.hist) else p.lg for p in E).items())) for i in range(3)])
  Dd=[p for p in ps3 if p.cls=='D']
  print("   D:",[dict(sorted(Counter(p.hist[i] if i<len(p.hist) else p.lg for p in Dd).items())) for i in range(3)])
# putanja tipičnog D igrača po sedmicama
import statistics as st
print("--- putanja igrača 3 partije/sedmično (klasa D, seed 1): medijan bodova i liga po sedmici")
rng=random.Random(1); ps=[]
for i in range(1000):
    x=i/1000; cls='A' if x<.70 else 'B' if x<.88 else 'C' if x<.95 else 'D' if x<.99 else 'E'
    p=P(cls,rng); p.sch=schedule(cls,rng); ps.append(p)
row=[]
for day in range(84):
    for p in ps:
        for _ in range(p.sch.get(day,0)): play(p,day,rng,True)
    if day%7==6:
        D=[p for p in ps if p.cls=='D']
        row.append((day//7+1, int(st.median(p.pts for p in D)), Counter(CFG['leagues'][p.lg] for p in D).most_common(2)))
for r in row: print(r)
