import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from 'react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from '@/internsa/lib/wouter-shim';
import {
  Activity as ActivityIcon, ArrowLeft, ArrowRight, Bookmark, BriefcaseBusiness, Check,
  ChevronDown, ExternalLink, LayoutDashboard, MapPin, Search, ShieldAlert,
  ShieldCheck, X, ChartNoAxesCombined, Plus, Pencil, Archive, Share2, BookOpen,
  House, UserRound, LogOut,
} from 'lucide-react';
import {
  type Activity, type AdminProfile, defaultAdminProfile, type Guide, type GuideStatus, type Opportunity, type Profile, type Report, type Store, emptyGuide, emptyOpportunity,
  readStore, writeStore, makeId, provinces, types, daysUntil, isLive, fetchOpportunities, fetchGuides,
} from '@/internsa/lib/repository';
import NotFound from '@/internsa/pages/not-found';
import { StudentLoginPage, StudentSignupPage } from '@/internsa/pages/auth';

const navLinks = [
  { href:'/', label:'Home', icon:House }, {href:'/dashboard',label:'Dashboard',icon:LayoutDashboard}, {href:'/explore',label:'Explore',icon:Search},
  {href:'/saved',label:'Saved',icon:Bookmark}, {href:'/guides',label:'Guides',icon:BookOpen},
  {href:'/profile',label:'Profile',icon:UserRound},
];
const publicLinks=[{ href:'/', label:'Home', icon:House },{href:'/explore',label:'Explore',icon:Search},{href:'/guides',label:'Guides',icon:BookOpen}];
const studentLinks=[
  {href:'/dashboard',label:'Dashboard',icon:LayoutDashboard},{href:'/explore',label:'Explore',icon:Search},
  {href:'/saved',label:'Saved',icon:Bookmark},{href:'/applications',label:'Applications',icon:BriefcaseBusiness},
  {href:'/guides',label:'Career guides',icon:BookOpen},{href:'/profile',label:'Profile',icon:UserRound},
];
const publicPaths=['/','/explore','/guides'];
const linksFor=(path:string,authed:boolean)=>authed?studentLinks:publicPaths.includes(path)?publicLinks:studentLinks;
const adminLinks = [
  {href:'/admin',label:'Overview',icon:LayoutDashboard},{href:'/admin/opportunities',label:'Opportunities',icon:BriefcaseBusiness},
  {href:'/admin/guides',label:'Guides',icon:BookOpen},
  {href:'/admin/reports',label:'Reports',icon:ShieldAlert},{href:'/admin/analytics',label:'Analytics',icon:ChartNoAxesCombined},
  {href:'/admin/profile',label:'Profile',icon:UserRound},
];

import { supabase } from '@/internsa/lib/supabase';

function AppShell() {
  const [store,setStore] = useState<Store>(() => readStore());
  const [location,setLocation] = useLocation();
  const [toast,setToast] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function loadData() {
      const [opps, guides] = await Promise.all([
        fetchOpportunities(),
        fetchGuides()
      ]);
      setStore(current => ({
        ...current,
        opportunities: opps.length > 0 ? opps : current.opportunities,
        guides: guides.length > 0 ? guides : current.guides
      }));
    }
    loadData();
  }, []);

  useEffect(()=>writeStore(store),[store]);
  useEffect(()=>{
    const nowClosed=store.opportunities.filter(o=>o.status==='published'&&daysUntil(o.closingDate)<0).map(o=>o.id);
    if(nowClosed.length)setStore(current=>({...current,opportunities:current.opportunities.map(o=>nowClosed.includes(o.id)?{...o,status:'closed'}:o)}));
  },[]);
  const announce=(message:string)=>{setToast(message);window.setTimeout(()=>setToast(''),2600)};
  const track=(kind:Activity['kind'], extra:Pick<Activity,'opportunityId'|'term'>={})=>{
    const entry:Activity={id:makeId(),kind,...extra,createdAt:new Date().toISOString()};
    setStore(current=>({...current,activity:[...current.activity,entry]}));
  };
  const toggleSave=(id:string)=>{
    const saved=store.savedIds.includes(id);
    setStore(current=>({...current,savedIds:saved?current.savedIds.filter(value=>value!==id):[...current.savedIds,id]}));
    track('save',{opportunityId:id});announce(saved?'Removed from saved':'Saved for later');
  };
  const ctx={store,setStore,announce,track,toggleSave,authed:!!user};
  const isAuthRoute=location==='/login'||location==='/signup'||location==='/admin/login';
  const isAdmin=location.startsWith('/admin')&&location!=='/admin/login';
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLocation('/login');
    announce('Logged out successfully.');
  };
  return <div className="app-shell">
    {isAuthRoute?<>
      <header className="topbar auth-topbar">
        <Link href="/" className="brand" data-testid="link-home"><span className="brand-mark">i</span><span className="brand-word">internsa<small>YOUR NEXT STEP</small></span></Link>
      </header>
      <Switch>
        <Route path="/login">{()=><StudentLoginPage/>}</Route>
        <Route path="/signup">{()=><StudentSignupPage/>}</Route>
        <Route path="/admin/login">{()=><StudentLoginPage/>}</Route>
        <Route><NotFound/></Route>
      </Switch>
    </>:<>
     <div className={`dashboard-shell ${isAdmin?'admin-dashboard-shell':'student-dashboard-shell'}`}>
        {isAdmin?<AdminSidebar path={location} onLogout={handleLogout}/>:<StudentSidebar path={location} authed={!!user} onLogout={handleLogout}/>}
        <div className="dashboard-main">
          <Switch>
            <Route path="/">{()=><Home {...ctx}/>}</Route>
            <Route path="/dashboard">{()=><StudentDashboard {...ctx}/>}</Route>
            <Route path="/applications">{()=><Applications {...ctx}/>}</Route>
            <Route path="/explore">{()=><Explore {...ctx}/>}</Route>
            <Route path="/saved">{()=><Saved {...ctx} authed={!!user}/>}</Route>
            <Route path="/guides">{()=><Guides {...ctx}/>}</Route>
            <Route path="/profile">{()=><ProfilePage {...ctx}/>}</Route>
            <Route path="/opportunities/:id">{params=><Detail id={params.id} {...ctx}/>}</Route>
            <Route path="/admin">{()=><AdminOverview {...ctx}/>}</Route>
            <Route path="/admin/opportunities">{()=><AdminOpportunities {...ctx}/>}</Route>
            <Route path="/admin/guides">{()=><AdminGuides {...ctx}/>}</Route>
            <Route path="/admin/reports">{()=><AdminReports {...ctx}/>}</Route>
            <Route path="/admin/analytics">{()=><AdminAnalytics {...ctx}/>}</Route>
            <Route path="/admin/profile">{()=><AdminProfilePage {...ctx}/>}</Route>
            <Route><NotFound/></Route>
          </Switch>
        </div>
      </div>
      {isAdmin?<AdminNav path={location}/>:<BottomNav path={location} authed={!!user}/>}
    </>}
    {toast&&<div className="toast" role="status" data-testid="status-toast">{toast}</div>}
  </div>;
}

type Context={store:Store;setStore:Dispatch<SetStateAction<Store>>;announce:(message:string)=>void;track:(kind:Activity['kind'],extra?:Pick<Activity,'opportunityId'|'term'>)=>void;toggleSave:(id:string)=>void;authed:boolean};
function Heading({eyebrow,title,sub,action}:{eyebrow:string;title:string;sub?:string;action?:ReactNode}) {
 return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{sub&&<p>{sub}</p>}</div>{action}</div>
}
function DashboardBrand({href}:{href:string}) {return <Link href={href} className="dashboard-brand" data-testid="link-dashboard-brand"><span className="brand-mark">i</span><span className="brand-word">internsa<small>YOUR NEXT STEP</small></span></Link>}
function StudentSidebar({path, authed, onLogout}:{path:string; authed:boolean; onLogout: () => void}) {
 const [,setLocation]=useLocation();
 const links=linksFor(path,authed);
 return <aside className="admin-side dashboard-side student-side" aria-label="Student dashboard sidebar">
  <DashboardBrand href="/"/>
  <nav className="sidebar-links" aria-label="Student dashboard">
   {links.map(({href,label,icon:Icon})=><Link key={href} href={href} className={path===href?'active':''} data-testid={`student-nav-${label.toLowerCase().replaceAll(' ','-')}`}><Icon size={16}/>{label}</Link>)}
  </nav>
  {authed?<div className="sidebar-footer">
   <button className="sidebar-logout" type="button" onClick={onLogout} data-testid="button-student-logout"><LogOut size={15}/>Log out</button>
  </div>:<div className="sidebar-footer">
    <div className="sidebar-account-links"><Link href="/login" data-testid="link-sidebar-login">Log in</Link><Link href="/signup" data-testid="link-sidebar-signup">Create account</Link></div>
  </div>}
 </aside>
}
function AdminSidebar({path, onLogout}:{path:string; onLogout: () => void}) {
 const [,setLocation]=useLocation();
 return <aside className="admin-side dashboard-side admin-side-global" aria-label="Admin dashboard sidebar">
  <DashboardBrand href="/admin"/>
  <p>Administration</p>
  <nav className="sidebar-links" aria-label="Admin dashboard">
   {adminLinks.map(({href,label,icon:Icon})=><Link key={href} href={href} className={path===href?'active':''} data-testid={`admin-nav-${label.toLowerCase()}`}><Icon size={15}/>{label}</Link>)}
  </nav>
  <div className="sidebar-footer">
   <button className="sidebar-logout" type="button" onClick={onLogout} data-testid="button-admin-logout"><LogOut size={15}/>Log out</button>
  </div>
 </aside>
}
function BottomNav({path, authed}:{path:string; authed:boolean}) {
 const links=linksFor(path,authed);
 return <nav className="bottom-nav" aria-label="Student dashboard navigation">
  {links.map(({href,label,icon:Icon})=><Link key={href} href={href} className={path===href?'active':''} data-testid={`mobile-nav-${label.toLowerCase()}`}><Icon size={17}/><span>{label}</span></Link>)}
  {!authed&&<>
   <Link href="/login" data-testid="mobile-nav-login"><ArrowLeft size={17}/><span>Log in</span></Link>
   <Link href="/signup" data-testid="mobile-nav-signup"><Plus size={17}/><span>Sign up</span></Link>
  </>}
 </nav>
}
function AdminNav({path}:{path:string}) {
 const [,setLocation]=useLocation();
 return <nav className="bottom-nav" aria-label="Admin dashboard navigation">
  {adminLinks.map(({href,label,icon:Icon})=><Link key={href} href={href} className={path===href?'active':''} data-testid={`mobile-admin-${label.toLowerCase()}`}><Icon size={17}/><span>{label}</span></Link>)}
  <button type="button" onClick={()=>setLocation('/login')} data-testid="button-admin-mobile-logout"><LogOut size={17}/><span>Log out</span></button>
 </nav>
}
function OpportunityCard({item,ctx}:{item:Opportunity;ctx:Context}) {
 const remaining=daysUntil(item.closingDate);
 const saved=ctx.store.savedIds.includes(item.id);
 return <article className="op-card" data-testid={`card-opportunity-${item.id}`}>
   <div className="card-top"><span className="org-mark">{item.organisation.split(/[· ]/).filter(Boolean).slice(-2).map(w=>w[0]).join('').slice(0,2).toUpperCase()}</span><div className="card-title"><p className="org-name" data-testid={`text-organisation-${item.id}`}>{item.organisation}</p><h3><Link href={`/opportunities/${item.id}`} className="text-link" data-testid={`link-opportunity-${item.id}`} style={{fontSize:'inherit',padding:0,color:'inherit',textAlign:'left'}}>{item.title}</Link></h3></div>{ctx.authed?<button type="button" className="save-icon" onClick={()=>ctx.toggleSave(item.id)} aria-label={saved?`Remove ${item.title} from saved`:`Save ${item.title}`} title={saved?'Remove from saved':'Save for later'} data-testid={`button-save-${item.id}`}><Bookmark size={18} fill={saved?'currentColor':'none'}/></button>:<Link className="save-icon" href="/login" aria-label={`Log in to save ${item.title}`} title="Log in to save" data-testid={`button-save-${item.id}`}><Bookmark size={18}/></Link>}</div>
   <div className="card-tags"><span className="tag">{item.type}</span><span className="tag"><MapPin size={11}/>{item.city||item.province}</span><span className="tag">{item.qualification}</span>{item.paidStatus!=='Not specified'&&<span className="tag">{item.paidStatus}</span>}</div>
   {!ctx.authed&&<div className="post-auth-cta"><span>{item.status==='published'&&remaining>=0?'Want to apply?':'Want to save this?'}</span><div><Link href="/login" data-testid={`link-login-${item.id}`}>Log in</Link><span aria-hidden="true">·</span><Link href="/signup" data-testid={`link-signup-${item.id}`}>Sign up</Link></div></div>}
   <div className="card-bottom"><div><span className="trust-line"><ShieldAlert size={12}/>{item.sourceStatus}</span><div className="card-deadline" data-testid={`text-deadline-${item.id}`}>{item.status==='closed'||remaining<0?'Closed':remaining===0?'Closes today':`Closes in ${remaining} day${remaining===1?'':'s'}`}</div></div><Link href={`/opportunities/${item.id}`} className="button primary small" data-testid={`button-view-${item.id}`}>View details <ArrowRight size={13}/></Link></div>
 </article>
}
function OpportunityGrid({items,ctx,empty='No opportunities match these choices yet.'}:{items:Opportunity[];ctx:Context;empty?:string}) {
 return items.length?<div className="cards-grid">{items.map(item=><OpportunityCard key={item.id} item={item} ctx={ctx}/>)}</div>:<div className="panel" style={{textAlign:'center',padding:34}}><Search size={24} color="#a4443b"/><h3 style={{fontFamily:'Newsreader',margin:'10px 0 4px'}}>Nothing in this view just yet</h3><p style={{color:'#77796f',fontSize:12,margin:0}}>{empty}</p></div>
}
function Home(ctx:Context) {
 const [,setLocation]=useLocation();
 const live=ctx.store.opportunities.filter(isLive), closing=[...live].sort((a,b)=>a.closingDate.localeCompare(b.closingDate)).slice(0,2);
 const latest=[...live].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,4);
  const publishedGuides=ctx.store.guides.filter(guide=>guide.status==='published').slice(0,2);
 const [search,setSearch]=useState('');
 const submit=(event:FormEvent)=>{event.preventDefault();ctx.track('search',{term:search});setLocation('/explore?q='+encodeURIComponent(search))};
 return <main className="content">
  <section className="hero" data-testid="section-home-hero"><div className="hero-copy"><p className="eyebrow">South African opportunity finder</p><h1 className="hero-title">Launch your career.<br/><em>One good step at a time.</em></h1><p>Find internships, graduate programmes, bursaries and training pathways with clear details to help you decide what comes next.</p>
   <form className="hero-search" onSubmit={submit}><input className="field" aria-label="Search opportunities" placeholder="Search role, field or province" value={search} onChange={e=>setSearch(e.target.value)} data-testid="input-home-search"/><button className="button primary" type="submit" data-testid="button-home-search"><Search size={15}/>Search opportunities</button></form>
   <div className="quick-pills" aria-label="Popular searches">{['Internship','Bursary','Learnership','Graduate programme'].map(t=><button key={t} className="pill" onClick={()=>{ctx.track('search',{term:t});setLocation('/explore?q='+encodeURIComponent(t))}} data-testid={`quick-search-${t.toLowerCase().replaceAll(' ','-')}`}>{t}</button>)}</div>
  </div><aside className="hero-aside"><span className="small-label">First, find your fit</span><strong>Search → Discover → Understand → Apply</strong><p>Compare the basics, check the source context, and take your next step with your eyes open.</p></aside></section>
  <section className="section-block"><div className="section-top"><div><h2>Closing soon</h2><p>Deadlines for these verified listings are kept current.</p></div><Link href="/explore" className="text-link" data-testid="link-closing-explore">Explore all <ArrowRight size={13}/></Link></div><OpportunityGrid items={closing} ctx={ctx} empty="No currently published listings." /></section>
  <section className="section-block"><div className="section-top"><div><h2>Recently added</h2><p>Verified listings · source details are confirmed.</p></div><Link href="/explore" className="text-link" data-testid="link-latest-explore">See all <ArrowRight size={13}/></Link></div><OpportunityGrid items={latest} ctx={ctx}/></section>
  <section className="section-block"><div className="section-top"><div><h2>Browse by province</h2><p>Start with a place that works for you.</p></div></div><div className="quick-pills">{provinces.map(p=><Link key={p} href={`/explore?province=${encodeURIComponent(p)}`} className="pill" data-testid={`province-${p.toLowerCase().replaceAll(' ','-')}`}>{p}</Link>)}</div></section>
   <section className="section-block"><div className="section-top"><div><h2>Small guides for the next step</h2><p>Practical preparation, without the jargon.</p></div><Link href="/guides" className="text-link" data-testid="link-guides">All guides <ArrowRight size={13}/></Link></div><div className="guide-grid">{publishedGuides.map((guide,i)=><article className="guide-card" key={guide.id}><span className="guide-index">{String(i+1).padStart(2,'0')}</span><p className="small-label">{guide.category} · {guide.read}</p><h3>{guide.title}</h3><p>{guide.copy}</p><Link href="/guides" className="text-link" data-testid={`guide-preview-${i}`}>Read guide <ArrowRight size={13}/></Link></article>)}</div></section>
 </main>
}

function StudentDashboard(ctx:Context) {
 const [,setLocation]=useLocation();
 const [search,setSearch]=useState('');
 const live=ctx.store.opportunities.filter(isLive);
 const closingWeek=live.filter(o=>daysUntil(o.closingDate)<=7);
 const closing=[...live].sort((a,b)=>a.closingDate.localeCompare(b.closingDate)).slice(0,3);
 const guides=ctx.store.guides.filter(g=>g.status==='published');
 const name=ctx.store.profile.name?.split(' ')[0]||'career explorer';
 const submit=(e:FormEvent)=>{e.preventDefault();ctx.track('search',{term:search});setLocation('/explore?q='+encodeURIComponent(search))};
 const stats=[
  {label:'Saved opportunities',value:ctx.store.savedIds.length,href:'/saved',cta:'View saved',icon:Bookmark,dark:true},
  {label:'Live opportunities',value:live.length,href:'/explore',cta:'Explore all',icon:BriefcaseBusiness},
  {label:'Closing this week',value:closingWeek.length,href:'/explore',cta:'Find opportunities',icon:ActivityIcon},
  {label:'Career guides',value:guides.length,href:'/guides',cta:'Browse guides',icon:BookOpen},
 ];
 return <main className="content" data-testid="page-student-dashboard">
  <section className="sd-welcome"><p className="eyebrow">Your next chapter</p><h1>Welcome, {name}.</h1><p className="sd-lead">Your future is full of opportunities.</p><p>Explore internships, bursaries, learnerships and graduate programmes across South Africa.</p>
   <form className="sd-search" onSubmit={submit}><Search size={16}/><input aria-label="Search opportunities" placeholder="Search opportunities..." value={search} onChange={e=>setSearch(e.target.value)} data-testid="input-dashboard-search"/><button className="button primary small" type="submit" aria-label="Search" data-testid="button-dashboard-search"><ArrowRight size={15}/></button></form>
  </section>
  <section className="sd-stats">{stats.map(({label,value,href,cta,icon:Icon,dark})=><article key={label} className={`sd-stat${dark?' dark':''}`} data-testid={`stat-${label.toLowerCase().replaceAll(' ','-')}`}><span className="sd-stat-icon"><Icon size={17}/></span><p>{label}</p><strong>{value}</strong><Link href={href} className="text-link">{cta} <ArrowRight size={13}/></Link></article>)}</section>
  <section className="section-block"><div className="section-top"><div><h2>Closing soon</h2><p>Don't miss these deadlines.</p></div><Link href="/explore" className="text-link">View all <ArrowRight size={13}/></Link></div><OpportunityGrid items={closing} ctx={ctx} empty="No currently published listings."/></section>
  <section className="section-block"><div className="section-top"><div><h2>Career guides</h2><p>Prepare for your next step.</p></div><Link href="/guides" className="text-link">All guides <ArrowRight size={13}/></Link></div><div className="quick-pills">{guides.slice(0,4).map(g=><Link key={g.id} href="/guides" className="pill"><BookOpen size={13}/> {g.title}</Link>)}</div></section>
 </main>
}
function Explore(ctx:Context) {
 const queryFromUrl=new URLSearchParams(window.location.search);
 const [query,setQuery]=useState(queryFromUrl.get('q')||'');
 const [type,setType]=useState('');const [province,setProvince]=useState(queryFromUrl.get('province')||'');const [industry,setIndustry]=useState('');const [paid,setPaid]=useState('');const [sort,setSort]=useState('newest');
 const available=ctx.store.opportunities.filter(isLive);
 const filtered=useMemo(()=>available.filter(o=>{
   const terms=`${o.title} ${o.organisation} ${o.type} ${o.province} ${o.city} ${o.industry} ${o.description}`.toLowerCase();
   return (!query||terms.includes(query.toLowerCase()))&&(!type||o.type.toLowerCase()===type.toLowerCase())&&(!province||o.province===province)&&(!industry||o.industry===industry)&&(!paid||o.paidStatus===paid);
 }).sort((a,b)=>sort==='closing'?a.closingDate.localeCompare(b.closingDate):sort==='relevant'?(Number(b.featured)-Number(a.featured)):b.createdAt.localeCompare(a.createdAt)),[available,query,type,province,industry,paid,sort]);
 const reset=()=>{setQuery('');setType('');setProvince('');setIndustry('');setPaid('');setSort('newest')};
 return <main className="content"><Heading eyebrow="Discover opportunities" title="Find a good fit." sub="Search across title, organisation, field and location. Every listing below is a verified vacancy."/>
  <label style={{display:'flex',alignItems:'center',gap:9}}><Search size={17} color="#77796f"/><input className="field" value={query} onChange={e=>{setQuery(e.target.value);if(e.target.value)ctx.track('search',{term:e.target.value})}} placeholder="Try “IT internship” or “Gauteng”" aria-label="Search listings" data-testid="input-explore-search"/></label>
  <div className="filters" aria-label="Opportunity filters">
   <div><label className="filter-label" htmlFor="filter-type">Opportunity type</label><select id="filter-type" className="select" value={type} onChange={e=>setType(e.target.value)} data-testid="select-filter-type"><option value="">All types</option>{types.map(v=><option key={v}>{v}</option>)}</select></div>
   <div><label className="filter-label" htmlFor="filter-province">Province</label><select id="filter-province" className="select" value={province} onChange={e=>setProvince(e.target.value)} data-testid="select-filter-province"><option value="">All locations</option>{provinces.map(v=><option key={v}>{v}</option>)}</select></div>
   <div><label className="filter-label" htmlFor="filter-industry">Industry</label><select id="filter-industry" className="select" value={industry} onChange={e=>setIndustry(e.target.value)} data-testid="select-filter-industry"><option value="">All industries</option>{Array.from(new Set(available.map(o=>o.industry))).map(v=><option key={v}>{v}</option>)}</select></div>
   <div><label className="filter-label" htmlFor="filter-paid">Compensation</label><select id="filter-paid" className="select" value={paid} onChange={e=>setPaid(e.target.value)} data-testid="select-filter-paid"><option value="">Any</option>{['Paid','Stipend','Unpaid','Not specified'].map(v=><option key={v}>{v}</option>)}</select></div>
  </div>
  <div className="results-head"><strong data-testid="text-result-count">{filtered.length} {filtered.length===1?'opportunity':'opportunities'}</strong><label style={{display:'flex',alignItems:'center',gap:7,fontSize:10}}>Sort <select className="select" style={{width:150}} value={sort} onChange={e=>setSort(e.target.value)} aria-label="Sort results" data-testid="select-sort"><option value="newest">Newest</option><option value="closing">Closing soon</option><option value="relevant">Featured first</option></select></label></div>
  <OpportunityGrid items={filtered} ctx={ctx} empty="Try removing a filter or searching a broader term."/>
 </main>
}

function Saved(ctx:Context&{authed?:boolean}) {
 if(ctx.authed){const items=ctx.store.opportunities.filter(o=>ctx.store.savedIds.includes(o.id));return <main className="content"><Heading eyebrow="Your shortlist" title="Saved opportunities" sub="Opportunities you saved to come back to later."/>{items.length?<div className="cards-grid">{items.map(item=><OpportunityCard key={item.id} item={item} ctx={ctx}/>)}</div>:<section className="panel saved-access"><Bookmark size={25} color="#a4443b"/><h2>Nothing saved yet</h2><p>Save opportunities while browsing and they will appear here.</p></section>}<div className="section-block"><Link href="/explore" className="button" data-testid="button-find-opportunities"><Search size={15}/>Browse opportunities</Link></div></main>}
 return <main className="content"><Heading eyebrow="Sign in required" title="Keep your shortlist" sub="Log in or create a student account to save opportunities and return to them later."/><section className="panel saved-access"><Bookmark size={25} color="#a4443b"/><h2>Save opportunities to your account</h2><p>Browse and read listings without an account. Saving them requires a student or job-seeker account.</p><div className="auth-required-links"><Link className="button primary" href="/login" data-testid="link-saved-login">Log in</Link><Link className="button" href="/signup" data-testid="link-saved-signup">Create a student account</Link></div></section><div className="section-block"><Link href="/explore" className="button" data-testid="button-find-opportunities"><Search size={15}/>Browse opportunities</Link></div></main>
}

function Detail({id,...ctx}:{id:string}&Context) {
 const item=ctx.store.opportunities.find(o=>o.id===id);
 useEffect(()=>{if(item)ctx.track('view',{opportunityId:id})},[id]);
 if(!item)return <main className="content"><Heading eyebrow="Opportunity" title="Listing not found"/><Link href="/explore" className="button" data-testid="link-back-explore"><ArrowLeft size={14}/>Back to Explore</Link></main>;
  const remaining=daysUntil(item.closingDate),isOpen=item.status==='published'&&remaining>=0;
 const share=async()=>{try{await navigator.clipboard.writeText(window.location.href);ctx.announce('Opportunity link copied.')}catch{ctx.announce('Copy unavailable; use your browser address bar to share.')}ctx.track('share',{opportunityId:id})};
 return <main className="content"><Link href="/explore" className="text-link" data-testid="link-detail-back"><ArrowLeft size={14}/> Back to results</Link>
  <div className="detail-layout" style={{marginTop:14}}><article className="detail-main">
   <div className="trust-line"><ShieldAlert size={14}/>{item.sourceStatus}</div>
   <p className="eyebrow" style={{marginTop:20}}>{item.type} · {item.industry}</p><h1 className="detail-title" data-testid="text-detail-title">{item.title}</h1><p className="detail-sub">{item.organisation} · {item.city||item.province} · {item.locationType}</p>
   <div className="card-tags"><span className="tag"><MapPin size={12}/>{item.province}</span><span className="tag">{item.qualification}</span><span className="tag">{item.experience}</span><span className="tag">{item.paidStatus}{item.stipend?` · ${item.stipend}`:''}</span></div>
   <div className={`notice ${remaining<=3?'warning':''}`} data-testid="text-detail-deadline"><strong>{item.status==='closed'||remaining<0?'This listing is marked closed':remaining===0?'Closes today':`Closes ${new Date(`${item.closingDate}T00:00:00`).toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'})}`}.</strong> Listing dates are kept current and can be edited in the admin dashboard.</div>
   <section className="detail-section"><h2>Overview</h2><p>{item.description}</p></section>
   <section className="detail-section"><h2>Requirements</h2><p>{item.requirements||'No requirements supplied.'}</p></section>
   <section className="detail-section"><h2>What you may do</h2><p>{item.responsibilities||'No responsibilities supplied.'}</p></section>
   <section className="detail-section"><h2>Benefits and stipend</h2><p>{item.benefits||'No benefits supplied.'} {item.stipend}</p></section>
   <section className="detail-section"><h2>How to apply</h2><p>{item.howToApply}</p></section>
   <section className="detail-section"><h2>Source details</h2><p>{item.sourceStatus}. The displayed URL is the verified employer application portal.</p><a className="text-link" href={item.sourceUrl} target="_blank" rel="noreferrer" onClick={e=>{e.preventDefault();ctx.announce('Verified source details.')}} data-testid="link-source-details">Verified source reference <ExternalLink size={13}/></a></section>
   <div className="notice warning" style={{marginTop:20}}><strong>Apply safely.</strong> InternSA never charges application fees. All listings are verified; applications go through each organisation's official portal.</div>
   </article><aside className="side-card"><span className="small-label">Your next step</span><h3>{isOpen?'Sign in to apply':'This listing is not open'}</h3><p style={{fontSize:11,color:'#77796f',lineHeight:1.6}}>{isOpen?'You can read the full listing without an account. Log in or create a student account before applying or saving it.':'This listing is closed or unavailable. You can still create an account to save other opportunities.'}</p>
    <div className="auth-required-links detail-auth-links">
      {isOpen&&<Link className="button primary" href="/login" data-testid="button-record-apply"><ArrowRight size={15}/>Log in to apply</Link>}
      <Link className="button" href="/signup" data-testid="button-detail-signup">Create student account</Link>
      <Link className="text-link" href="/login" data-testid="button-detail-save"><Bookmark size={14}/>Log in to save</Link>
    </div>
   <button className="button" type="button" onClick={share} data-testid="button-share"><Share2 size={15}/>Share / copy link</button>
    <Link className="button" href="/login" data-testid="button-report"><ShieldAlert size={15}/>Log in to report this listing</Link>
   <div className="side-meta"><div><span>Closing date</span><strong>{new Date(`${item.closingDate}T00:00:00`).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'})}</strong></div><div><span>Source status</span><strong>{item.sourceStatus}</strong></div><div><span>Local intents</span><strong>{ctx.store.applyIntents.filter(a=>a.opportunityId===id).length}</strong></div></div>
  </aside></div>
 </main>
}
function Dialog({title,children,close}:{title:string;children:ReactNode;close:()=>void}) {return <div className="dialog-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><section className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div className="dialog-head"><h2 id="dialog-title">{title}</h2><button className="dialog-close" onClick={close} aria-label="Close dialog" data-testid="button-close-dialog"><X size={16}/></button></div>{children}</section></div>}

function ProfilePage({store,setStore,announce}:Context) {
 const [p,setP]=useState<Profile>(store.profile);
 const set=(k:keyof Profile)=>(e:{target:{value:string}})=>setP(v=>({...v,[k]:e.target.value}));
 const save=(e:FormEvent)=>{e.preventDefault();setStore(s=>({...s,profile:p}));announce('Profile saved on this device.');};
 const choices=['Internship','Bursary','Learnership','Graduate programme','Entry-level job'];
 const fields=[p.name,p.email,p.phone,p.institution,p.fieldOfStudy,p.qualification,p.goal,p.cvUrl];
 const done=Math.round(fields.filter(Boolean).length/fields.length*100);
 const F=({id,label,k,ph,type='text',full}:{id:string;label:string;k:keyof Profile;ph?:string;type?:string;full?:boolean})=><div className={`form-field${full?' full':''}`}><label htmlFor={id}>{label}</label><input className="field" id={id} type={type} value={(p[k] as string)||''} onChange={set(k)} placeholder={ph} data-testid={`input-${id}`}/></div>;
 return <main className="content"><Heading eyebrow="Your profile" title="Profile & career details" sub="Keep your details current so opportunities match you better. Saved only in this browser."/>
 <div className="notice" style={{marginBottom:18,maxWidth:760}}><strong>Profile {done}% complete.</strong> Add your study details, career goal and CV link to finish.</div>
 <form className="panel" onSubmit={save} style={{maxWidth:760}}>
  <h3 className="profile-section">Personal details</h3><div className="form-grid">
   {F({id:'profile-name',label:'Full name',k:'name',ph:'Your name'})}{F({id:'profile-email',label:'Email address',k:'email',ph:'you@example.com',type:'email'})}
   {F({id:'profile-phone',label:'Phone number',k:'phone',ph:'e.g. 071 234 5678',type:'tel'})}
   <div className="form-field"><label htmlFor="profile-province">Province</label><select id="profile-province" className="select" value={p.province} onChange={set('province')} data-testid="select-profile-province">{provinces.map(x=><option key={x}>{x}</option>)}</select></div>
  </div>
  <h3 className="profile-section">Education</h3><div className="form-grid">
   {F({id:'profile-institution',label:'Institution',k:'institution',ph:'e.g. University of Pretoria'})}{F({id:'profile-field',label:'Field of study',k:'fieldOfStudy',ph:'e.g. Computer Science'})}
   {F({id:'profile-qualification',label:'Current qualification / study level',k:'qualification',ph:'e.g. Final-year diploma student'})}{F({id:'profile-grad',label:'Graduation year',k:'graduationYear',ph:'e.g. 2026'})}
  </div>
  <h3 className="profile-section">Career preferences</h3><div className="form-grid">
   <div className="form-field full"><label htmlFor="profile-goal">Career goal</label><textarea className="field" id="profile-goal" rows={3} value={p.goal||''} onChange={set('goal')} placeholder="What kind of role are you working towards?" data-testid="input-profile-goal"/></div>
   <div className="form-field"><label htmlFor="profile-work">Work preference</label><select id="profile-work" className="select" value={p.workPreference||'Any'} onChange={set('workPreference')}>{['Any','On-site','Hybrid','Remote'].map(x=><option key={x}>{x}</option>)}</select></div>
   <div/>
   <fieldset className="form-field full" style={{border:0,padding:0,margin:0}}><legend className="filter-label">Opportunity interests</legend><div className="quick-pills" style={{marginTop:0}}>{choices.map(c=><button type="button" key={c} className={`pill ${p.interests.includes(c)?'active':''}`} aria-pressed={p.interests.includes(c)} onClick={()=>setP(v=>({...v,interests:v.interests.includes(c)?v.interests.filter(x=>x!==c):[...v.interests,c]}))} data-testid={`toggle-interest-${c.toLowerCase().replaceAll(' ','-')}`}>{c}</button>)}</div></fieldset>
  </div>
  <h3 className="profile-section">CV & links</h3><div className="form-grid">
   {F({id:'profile-cv',label:'CV link',k:'cvUrl',ph:'Link to your CV (Google Drive, etc.)',type:'url'})}{F({id:'profile-linkedin',label:'LinkedIn profile',k:'linkedinUrl',ph:'https://linkedin.com/in/...',type:'url'})}
  </div>
  <button className="button primary" type="submit" style={{marginTop:18}} data-testid="button-save-profile"><Check size={15}/>Save profile</button></form></main>
}
function AdminProfilePage({store,setStore,announce}:Context) {
 const [p,setP]=useState<AdminProfile>(store.adminProfile??defaultAdminProfile);
 const set=(k:keyof AdminProfile)=>(e:{target:{value:string}})=>setP(v=>({...v,[k]:e.target.value}));
 const save=(e:FormEvent)=>{e.preventDefault();setStore(s=>({...s,adminProfile:p}));announce('Admin profile saved on this device.');};
 const openReports=store.reports.filter(r=>r.status==='open').length, published=store.opportunities.filter(o=>o.status==='published').length;
 const toggles:[keyof AdminProfile,string][]=[['notifyReports','Email me when a listing is reported'],['notifyClosing','Remind me about listings closing within 3 days'],['weeklySummary','Send a weekly activity summary']];
 return <main className="content"><Heading eyebrow="Administrator" title="Admin profile & settings" sub="Your contact details, role and notification preferences. Saved only in this browser."/>
 <div className="sd-stats" style={{maxWidth:760,gridTemplateColumns:'repeat(3,minmax(0,1fr))'}}>
  <article className="sd-stat"><p>Published listings</p><strong>{published}</strong></article>
  <article className="sd-stat"><p>Open reports</p><strong>{openReports}</strong></article>
  <article className="sd-stat"><p>Published guides</p><strong>{store.guides.filter(g=>g.status==='published').length}</strong></article>
 </div>
 <form className="panel" onSubmit={save} style={{maxWidth:760}}>
  <h3 className="profile-section">Contact details</h3><div className="form-grid">
   <div className="form-field"><label htmlFor="admin-name">Full name</label><input className="field" id="admin-name" value={p.name} onChange={set('name')} placeholder="Your name" data-testid="input-admin-name"/></div>
   <div className="form-field"><label htmlFor="admin-email">Work email</label><input className="field" id="admin-email" type="email" value={p.email} onChange={set('email')} placeholder="name@internsa.co.za" data-testid="input-admin-email"/></div>
   <div className="form-field"><label htmlFor="admin-phone">Phone number</label><input className="field" id="admin-phone" type="tel" value={p.phone} onChange={set('phone')} placeholder="e.g. 011 123 4567"/></div>
   <div className="form-field"><label htmlFor="admin-org">Organisation</label><input className="field" id="admin-org" value={p.organisation} onChange={set('organisation')}/></div>
  </div>
  <h3 className="profile-section">Role</h3><div className="form-grid">
   <div className="form-field"><label htmlFor="admin-title">Job title</label><input className="field" id="admin-title" value={p.jobTitle} onChange={set('jobTitle')} data-testid="input-admin-title"/></div>
   <div className="form-field"><label htmlFor="admin-dept">Department</label><select id="admin-dept" className="select" value={p.department} onChange={set('department')}>{['Opportunities & partnerships','Content & guides','Trust & safety','Operations'].map(x=><option key={x}>{x}</option>)}</select></div>
  </div>
  <h3 className="profile-section">Notifications</h3>
  <div style={{display:'grid',gap:10}}>{toggles.map(([k,label])=><label key={k} style={{display:'flex',gap:10,alignItems:'center',fontSize:14}}><input type="checkbox" checked={p[k] as boolean} onChange={e=>setP(v=>({...v,[k]:e.target.checked}))} data-testid={`toggle-${k}`}/>{label}</label>)}</div>
  <button className="button primary" type="submit" style={{marginTop:18}} data-testid="button-save-admin-profile"><Check size={15}/>Save settings</button></form></main>
}
function Applications({store}:Context) {
 const items=store.applyIntents.map(a=>({a,o:store.opportunities.find(o=>o.id===a.opportunityId)})).filter(x=>x.o) as {a:{id:string;createdAt:string};o:Opportunity}[];
 return <main className="content"><Heading eyebrow="Your applications" title="Application tracker" sub="Opportunities you've started applying for. Tracked only in this browser."/>
  {items.length?<div className="panel" style={{display:'grid',gap:12}}>{items.map(({a,o})=><div key={a.id} className="section-top" style={{borderBottom:'1px solid #e3ddd0',paddingBottom:10}}><div><h3 style={{margin:0}}><Link href={`/opportunities/${o.id}`} className="text-link" style={{padding:0}}>{o.title}</Link></h3><p style={{margin:'2px 0 0',fontSize:12,color:'#77796f'}}>{o.organisation} · started {new Date(a.createdAt).toLocaleDateString('en-ZA')}</p></div><span className="tag">{daysUntil(o.closingDate)<0?'Closed':`Closes in ${daysUntil(o.closingDate)} days`}</span></div>)}</div>
  :<div className="panel" style={{textAlign:'center',padding:34}}><BriefcaseBusiness size={24} color="#a4443b"/><h3 style={{fontFamily:'Newsreader',margin:'10px 0 4px'}}>No applications yet</h3><p style={{color:'#77796f',fontSize:12}}>When you start applying for an opportunity it will show up here.</p><Link href="/explore" className="button primary small">Explore opportunities <ArrowRight size={13}/></Link></div>}
 </main>
}
function Guides({store}:Context) {
 const published=store.guides.filter(guide=>guide.status==='published');
 return <main className="content">
  <Heading eyebrow="Career notes" title="A little help, right on time." sub="Short, practical reading to support your next move. Guides are verified content and are not employment or legal advice."/>
  {published.length?<div className="guide-grid">{published.map((guide,index)=><article className="guide-card" key={guide.id} data-testid={`card-guide-${guide.id}`}><span className="guide-index">{String(index+1).padStart(2,'0')}</span><p className="small-label">{guide.category} · {guide.read}</p><h3>{guide.title}</h3><p>{guide.copy}</p><details><summary className="text-link" style={{cursor:'pointer'}} data-testid={`button-open-guide-${guide.id}`}>Read the practical checklist <ChevronDown size={13}/></summary>{guide.checklist.length?<ul style={{fontSize:11,color:'#65675f',lineHeight:1.8,paddingLeft:18,marginTop:10}}>{guide.checklist.map((step,stepIndex)=><li key={`${guide.id}-${stepIndex}`}>{step}</li>)}</ul>:<p style={{fontSize:11,color:'#65675f'}}>Checklist coming soon.</p>}</details></article>)}</div>:<div className="panel" style={{padding:28,textAlign:'center',color:'#77796f',fontSize:12}}>No guides are published yet.</div>}
  <div className="notice warning" style={{marginTop:20}}><strong>Keep your information safe.</strong> Share sensitive personal or banking information only with verified sources.</div>
 </main>
}

type OpportunityFormProps={initial:Opportunity;onSave:(item:Opportunity)=>void;onCancel:()=>void};
function OpportunityForm({initial,onSave,onCancel}:OpportunityFormProps) {
 const [item,setItem]=useState<Opportunity>(initial);
 const change=(key:keyof Opportunity,value:string|boolean)=>setItem(v=>({...v,[key]:value}));
 const field=(label:string,key:keyof Opportunity,placeholder='',full=false)=> <div className={`form-field ${full?'full':''}`} key={key}><label htmlFor={`op-${key}`}>{label}</label><input className="field" id={`op-${key}`} value={String(item[key])} onChange={e=>change(key,e.target.value)} placeholder={placeholder} data-testid={`input-opportunity-${key}`}/></div>;
 const area=(label:string,key:keyof Opportunity,full=true)=> <div className={`form-field ${full?'full':''}`} key={key}><label htmlFor={`op-${key}`}>{label}</label><textarea className="textarea" id={`op-${key}`} value={String(item[key])} onChange={e=>change(key,e.target.value)} data-testid={`input-opportunity-${key}`}/></div>;
 const select=(label:string,key:keyof Opportunity,options:string[])=> <div className="form-field" key={key}><label htmlFor={`op-${key}`}>{label}</label><select id={`op-${key}`} className="select" value={String(item[key])} onChange={e=>change(key,e.target.value)} data-testid={`select-opportunity-${key}`}>{options.map(v=><option key={v}>{v}</option>)}</select></div>;
 return <form onSubmit={e=>{e.preventDefault();onSave({...item,title:item.title.trim(),organisation:item.organisation.trim(),createdAt:item.createdAt||new Date().toISOString()})}}>
  <div className="notice warning" style={{marginBottom:14}}>All records are verified listings. Use each organisation's official application URL.</div>
  <div className="form-grid">{field('Opportunity title','title','e.g. Community data intern')}{field('Organisation','organisation','Organisation name')}{select('Type','type',types)}{select('Status','status',['draft','published','closed','archived'])}{select('Province','province',provinces)}{field('City / area','city')}{select('Location type','locationType',['On-site','Remote','Hybrid','National'])}{field('Industry','industry')}{field('Qualification','qualification')}{field('Experience','experience')}{select('Paid status','paidStatus',['Paid','Stipend','Unpaid','Not specified','Not applicable'])}{field('Stipend / support','stipend')}{<div className="form-field"><label htmlFor="op-closingDate">Closing date</label><input className="field" id="op-closingDate" type="date" value={item.closingDate} onChange={e=>change('closingDate',e.target.value)} data-testid="input-opportunity-closingDate"/></div>}{field('Source URL (verified)','sourceUrl')}{field('Source status','sourceStatus')}{area('Description','description')}{area('Requirements','requirements')}{area('Responsibilities','responsibilities')}{area('Benefits','benefits')}{area('How to apply','howToApply')}</div>
  <label style={{display:'flex',gap:8,alignItems:'center',fontSize:11,marginTop:13}}><input type="checkbox" checked={item.featured} onChange={e=>change('featured',e.target.checked)} data-testid="checkbox-opportunity-featured"/>Feature this listing</label>
  <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:20}}><button className="button" type="button" onClick={onCancel} data-testid="button-cancel-opportunity">Cancel</button><button className="button primary" type="submit" disabled={!item.title.trim()} data-testid="button-save-opportunity"><Check size={14}/>Save listing</button></div>
 </form>
}

type GuideFormProps={initial:Guide;onSave:(guide:Guide)=>void;onCancel:()=>void};
function GuideForm({initial,onSave,onCancel}:GuideFormProps) {
 const [guide,setGuide]=useState<Guide>(initial);
 const textField=(key:'title'|'category'|'read'|'copy',value:string)=>setGuide(current=>({...current,[key]:value}));
 return <form onSubmit={event=>{event.preventDefault();onSave({...guide,title:guide.title.trim(),category:guide.category.trim(),copy:guide.copy.trim(),read:guide.read.trim()||'5 min read',checklist:guide.checklist.map(step=>step.trim()).filter(Boolean)})}}>
  <div className="notice" style={{marginBottom:14}}>Drafts stay hidden from students. Publish a guide when it is ready for the public Guides page.</div>
  <div className="form-grid">
   <div className="form-field"><label htmlFor="guide-title">Guide title</label><input className="field" id="guide-title" value={guide.title} onChange={event=>textField('title',event.target.value)} placeholder="e.g. Prepare for a career fair" required data-testid="input-guide-title"/></div>
   <div className="form-field"><label htmlFor="guide-category">Category</label><input className="field" id="guide-category" value={guide.category} onChange={event=>textField('category',event.target.value)} placeholder="e.g. Interviews" required data-testid="input-guide-category"/></div>
   <div className="form-field"><label htmlFor="guide-read">Reading time</label><input className="field" id="guide-read" value={guide.read} onChange={event=>textField('read',event.target.value)} placeholder="5 min read" data-testid="input-guide-read"/></div>
   <div className="form-field"><label htmlFor="guide-status">Status</label><select className="select" id="guide-status" value={guide.status} onChange={event=>setGuide(current=>({...current,status:event.target.value as GuideStatus}))} data-testid="select-guide-status"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div>
   <div className="form-field full"><label htmlFor="guide-copy">Short description</label><textarea className="textarea" id="guide-copy" value={guide.copy} onChange={event=>textField('copy',event.target.value)} placeholder="What will a student learn from this guide?" required data-testid="input-guide-copy"/></div>
   <div className="form-field full"><label htmlFor="guide-checklist">Practical checklist</label><textarea className="textarea" id="guide-checklist" value={guide.checklist.join('\n')} onChange={event=>setGuide(current=>({...current,checklist:event.target.value.split('\n')}))} placeholder="One checklist item per line" data-testid="input-guide-checklist"/><small style={{display:'block',marginTop:5,color:'#77796f',fontSize:10}}>Each line becomes a separate checklist item.</small></div>
  </div>
  <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:20}}><button className="button" type="button" onClick={onCancel} data-testid="button-cancel-guide">Cancel</button><button className="button primary" type="submit" disabled={!guide.title.trim()||!guide.category.trim()||!guide.copy.trim()} data-testid="button-save-guide"><Check size={14}/>Save guide</button></div>
 </form>
}

function AdminOverview(ctx:Context) {
 const [period,setPeriod]=useState(7);
 const cutoff=Date.now()-period*86400000, recent=ctx.store.activity.filter(a=>new Date(a.createdAt).getTime()>=cutoff);
 const live=ctx.store.opportunities.filter(isLive),pending=ctx.store.reports.filter(r=>r.status==='open');
 const lastDays=Array.from({length:7},(_,i)=>{const date=new Date();date.setDate(date.getDate()-(6-i));const key=date.toISOString().slice(0,10);return {key,label:date.toLocaleDateString('en',{weekday:'short'}),count:ctx.store.activity.filter(a=>a.kind==='apply'&&a.createdAt.slice(0,10)===key).length}});
 const max=Math.max(1,...lastDays.map(d=>d.count));
 return <main className="content"><Heading eyebrow="Admin · Overview" title="A useful view of the dashboard." sub="Computed from stored verified listings and activity. The role switch is not authentication or security." action={<label style={{fontSize:10,fontWeight:700}}>Activity window <select className="select" style={{width:125,marginLeft:7}} value={period} onChange={e=>setPeriod(Number(e.target.value))} data-testid="select-admin-period"><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select></label>}/>
  <div className="admin-content"><div>
  <div className="metric-grid">{[['Published listings',live.length],['Apply intents',recent.filter(a=>a.kind==='apply').length],['Saved actions',recent.filter(a=>a.kind==='save').length],['Reports to review',pending.length]].map(([label,value],i)=><article className="metric" key={String(label)} data-testid={`metric-${i}`}><span>{label}</span><strong>{value}</strong><small>Local records · last {period} days</small></article>)}</div>
  <section className="panel section-block"><div className="section-top"><div><h2>Apply intent activity</h2><p>Recorded intents by day · derived from local activity history</p></div><ActivityIcon size={18} color="#294f81"/></div><div className="chart" role="img" aria-label="Daily apply intent counts">{lastDays.map(d=><div className="chart-bar" key={d.key} style={{height:`${Math.max(d.count?12:4,d.count/max*155)}px`}}><strong>{d.count}</strong></div>)}</div><div className="chart-labels">{lastDays.map(d=><span key={d.key}>{d.label}</span>)}</div></section>
  <section className="panel section-block"><div className="section-top"><div><h2>Listing mix</h2><p>Status totals from current saved opportunity records</p></div><Link href="/admin/opportunities" className="text-link" data-testid="link-manage-listings">Manage listings <ArrowRight size={13}/></Link></div><div className="quick-pills">{(['published','draft','closed','archived'] as const).map(status=><span className="tag" key={status}>{status}: {ctx.store.opportunities.filter(o=>o.status===status).length}</span>)}</div></section>
 </div></div></main>
}
function AdminOpportunities({store,setStore,announce}:Context) {
 const [query,setQuery]=useState(''),[editing,setEditing]=useState<Opportunity|null>(null),[create,setCreate]=useState(false);
 const rows=store.opportunities.filter(o=>`${o.title} ${o.organisation} ${o.type} ${o.province}`.toLowerCase().includes(query.toLowerCase()));
 const save=(item:Opportunity)=>{const exists=store.opportunities.some(o=>o.id===item.id);const complete={...item,id:item.id||makeId(),createdAt:item.createdAt||new Date().toISOString()};setStore(s=>({...s,opportunities:exists?s.opportunities.map(o=>o.id===complete.id?complete:o):[complete,...s.opportunities]}));setCreate(false);setEditing(null);announce(exists?'Listing updated locally.':'Listing created locally.');};
 const setStatus=(item:Opportunity,status:Opportunity['status'])=>{setStore(s=>({...s,opportunities:s.opportunities.map(o=>o.id===item.id?{...o,status}:o)}));announce(`Listing ${status}.`);};
 return <main className="content"><Heading eyebrow="Admin · Listings" title="Opportunity listings" sub="Create and manage verified records. Changes immediately affect student discovery and analytics." action={<button className="button primary" onClick={()=>setCreate(true)} data-testid="button-create-opportunity"><Plus size={15}/>New listing</button>}/>
  <div className="admin-content"><div><label style={{display:'flex',gap:8,alignItems:'center'}}><Search size={16}/><input className="field" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search listings" aria-label="Search admin listings" data-testid="input-admin-search"/></label>
  <div className="table-wrap section-block"><table><thead><tr><th>Opportunity</th><th>Location</th><th>Closing</th><th>Status</th><th>Actions</th></tr></thead><tbody>{rows.map(item=><tr key={item.id} data-testid={`row-admin-opportunity-${item.id}`}><td><strong>{item.title}</strong><br/><span style={{color:'#888',fontSize:9}}>{item.organisation}</span></td><td>{item.city||item.province}</td><td>{item.closingDate}</td><td><span className={`status-badge ${item.status}`}>{item.status}</span></td><td><div className="table-actions"><button className="button small" onClick={()=>setEditing(item)} aria-label={`Edit ${item.title}`} data-testid={`button-edit-${item.id}`}><Pencil size={12}/>Edit</button>{item.status!=='published'&&<button className="button small" onClick={()=>setStatus(item,'published')} data-testid={`button-publish-${item.id}`}>Publish</button>}{item.status==='published'&&<button className="button small" onClick={()=>setStatus(item,'closed')} data-testid={`button-close-${item.id}`}>Close</button>}{item.status!=='archived'&&<button className="button small" onClick={()=>setStatus(item,'archived')} aria-label={`Archive ${item.title}`} data-testid={`button-archive-${item.id}`}><Archive size={12}/></button>}</div></td></tr>)}</tbody></table>{rows.length===0&&<div style={{padding:24,textAlign:'center',fontSize:12,color:'#777'}}>No matching listing. Clear the search or create a new listing.</div>}</div></div></div>
  {(create||editing)&&<Dialog title={create?'Create a listing':'Edit listing'} close={()=>{setCreate(false);setEditing(null)}}><OpportunityForm initial={editing||emptyOpportunity()} onSave={save} onCancel={()=>{setCreate(false);setEditing(null)}}/></Dialog>}
 </main>
}
function AdminGuides({store,setStore,announce}:Context) {
 const [query,setQuery]=useState(''),[editing,setEditing]=useState<Guide|null>(null),[create,setCreate]=useState(false);
 const rows=store.guides.filter(guide=>`${guide.title} ${guide.category} ${guide.copy}`.toLowerCase().includes(query.toLowerCase()));
 const save=(guide:Guide)=>{
  const exists=store.guides.some(item=>item.id===guide.id);
  const complete={...guide,id:guide.id||makeId(),createdAt:guide.createdAt||new Date().toISOString()};
  setStore(current=>({...current,guides:current.guides.some(item=>item.id===complete.id)?current.guides.map(item=>item.id===complete.id?complete:item):[complete,...current.guides]}));
  setCreate(false);setEditing(null);announce(exists?'Guide updated locally.':'Guide created locally.');
 };
 const setStatus=(guide:Guide,status:GuideStatus)=>{
  setStore(current=>({...current,guides:current.guides.map(item=>item.id===guide.id?{...item,status}:item)}));
  announce(status==='published'?'Guide published and visible to students.':status==='draft'?'Guide moved to draft and hidden from students.':'Guide archived and hidden from students.');
 };
 return <main className="content"><Heading eyebrow="Admin · Learning" title="Guides" sub="Create and manage practical reading for students. Published guides appear on the public Guides page and landing-page previews." action={<button className="button primary" onClick={()=>setCreate(true)} data-testid="button-create-guide"><Plus size={15}/>New guide</button>}/>
  <div className="admin-content"><div><label style={{display:'flex',gap:8,alignItems:'center'}}><Search size={16}/><input className="field" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search guides" aria-label="Search admin guides" data-testid="input-admin-guide-search"/></label>
   <div className="table-wrap section-block"><table><thead><tr><th>Guide</th><th>Category</th><th>Reading time</th><th>Status</th><th>Actions</th></tr></thead><tbody>{rows.map(guide=><tr key={guide.id} data-testid={`row-admin-guide-${guide.id}`}><td><strong>{guide.title}</strong><br/><span style={{color:'#888',fontSize:9}}>{guide.copy}</span></td><td>{guide.category}</td><td>{guide.read}</td><td><span className={`status-badge ${guide.status}`}>{guide.status}</span></td><td><div className="table-actions"><button className="button small" onClick={()=>setEditing(guide)} aria-label={`Edit ${guide.title}`} data-testid={`button-edit-guide-${guide.id}`}><Pencil size={12}/>Edit</button>{guide.status==='published'?<button className="button small" onClick={()=>setStatus(guide,'draft')} data-testid={`button-unpublish-guide-${guide.id}`}>Unpublish</button>:<button className="button small" onClick={()=>setStatus(guide,'published')} data-testid={`button-publish-guide-${guide.id}`}>Publish</button>}{guide.status!=='archived'&&<button className="button small" onClick={()=>setStatus(guide,'archived')} aria-label={`Archive ${guide.title}`} data-testid={`button-archive-guide-${guide.id}`}><Archive size={12}/></button>}</div></td></tr>)}</tbody></table>{rows.length===0&&<div style={{padding:24,textAlign:'center',fontSize:12,color:'#77796f'}}>No matching guides. Clear the search or create a new guide.</div>}</div>
  </div></div>
  {(create||editing)&&<Dialog title={create?'Add a guide':'Edit guide'} close={()=>{setCreate(false);setEditing(null)}}><GuideForm initial={editing||emptyGuide()} onSave={save} onCancel={()=>{setCreate(false);setEditing(null)}}/></Dialog>}
 </main>
}
function AdminReports({store,setStore,announce}:Context) {
 const reports=[...store.reports].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
 const resolve=(id:string)=>{setStore(s=>({...s,reports:s.reports.map(r=>r.id===id?{...r,status:'resolved'}:r)}));announce('Report marked resolved.');};
 return <main className="content"><Heading eyebrow="Admin · Moderation" title="Report review" sub="Reports submitted from opportunity details appear here for local review."/><div className="admin-content"><div>
  {reports.length===0?<div className="panel" style={{textAlign:'center',padding:38}}><ShieldCheck size={26} color="#507455"/><h2 style={{fontFamily:'Newsreader',margin:'12px 0 5px'}}>No reports to review</h2><p style={{color:'#77796f',fontSize:12}}>When a student flags a listing, it will be added to this queue.</p><Link href="/explore" className="button" data-testid="link-review-explore">Browse listings</Link></div>:<div className="table-wrap"><table><thead><tr><th>Listing</th><th>Reason</th><th>Details</th><th>Reported</th><th>Status</th><th></th></tr></thead><tbody>{reports.map(r=>{const opportunity=store.opportunities.find(o=>o.id===r.opportunityId);return <tr key={r.id} data-testid={`row-report-${r.id}`}><td><strong>{opportunity?.title||'Listing removed'}</strong></td><td>{r.reason}</td><td>{r.details||'—'}</td><td>{new Date(r.createdAt).toLocaleDateString()}</td><td><span className={`status-badge ${r.status==='resolved'?'closed':'draft'}`}>{r.status}</span></td><td>{r.status==='open'&&<button className="button small" onClick={()=>resolve(r.id)} data-testid={`button-resolve-${r.id}`}><Check size={12}/>Resolve</button>}</td></tr>})}</tbody></table></div>}
 </div></div></main>
}
function AdminAnalytics({store}:Context) {
 const [period,setPeriod]=useState(30),[kind,setKind]=useState('all'),cutoff=Date.now()-period*86400000;
 const actions=store.activity.filter(a=>new Date(a.createdAt).getTime()>=cutoff&&(kind==='all'||a.kind===kind));
 const typesOfAction=['view','search','save','apply','report','share'] as const;
 const counts=typesOfAction.map(k=>({kind:k,count:actions.filter(a=>a.kind===k).length}));
 const daily=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));const date=d.toISOString().slice(0,10);return {date,label:d.toLocaleDateString('en',{weekday:'short'}),count:actions.filter(a=>a.createdAt.slice(0,10)===date).length}});
 const max=Math.max(1,...daily.map(d=>d.count));
 const searchTerms=Object.entries(actions.filter(a=>a.kind==='search'&&a.term).reduce<Record<string,number>>((acc,a)=>{const term=(a.term||'').toLowerCase();acc[term]=(acc[term]||0)+1;return acc},{})).sort((a,b)=>b[1]-a[1]).slice(0,5);
 return <main className="content"><Heading eyebrow="Admin · Analytics" title="What people are exploring." sub="Local activity only. Counts are derived from records and actions; no user-level personal data is collected." action={<label style={{fontSize:10,fontWeight:700}}>Range <select className="select" style={{width:130,marginLeft:7}} value={period} onChange={e=>setPeriod(Number(e.target.value))} data-testid="select-analytics-period"><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select></label>}/>
 <div className="admin-content"><div><div className="metric-grid">{counts.map((x,i)=><article className="metric" key={x.kind} data-testid={`analytics-metric-${x.kind}`}><span>{x.kind.charAt(0).toUpperCase()+x.kind.slice(1)} events</span><strong>{x.count}</strong><small>Selected period · {period} days</small></article>)}</div>
 <section className="panel section-block"><div className="section-top"><div><h2>Activity timeline</h2><p>All local events per day, filtered below.</p></div><select className="select" style={{width:135}} value={kind} onChange={e=>setKind(e.target.value)} aria-label="Filter activity type" data-testid="select-analytics-kind"><option value="all">All activity</option>{typesOfAction.map(k=><option key={k} value={k}>{k}</option>)}</select></div><div className="chart">{daily.map(d=><div key={d.date} className="chart-bar" style={{height:`${Math.max(d.count?12:4,d.count/max*155)}px`}}><strong>{d.count}</strong></div>)}</div><div className="chart-labels">{daily.map(d=><span key={d.date}>{d.label}</span>)}</div></section>
 <section className="panel section-block"><div className="section-top"><div><h2>Search terms</h2><p>Based on searches recorded in local activity.</p></div></div>{searchTerms.length?<div className="quick-pills">{searchTerms.map(([term,count])=><span className="tag" key={term}>{term} · {count}</span>)}</div>:<p style={{fontSize:12,color:'#77796f'}}>No search activity in this range yet. Search Explore to add events.</p>}</section>
 </div></div></main>
}

function App() {
  return <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><AppShell/></WouterRouter>;
}

export default App;
