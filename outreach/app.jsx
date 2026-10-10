const {useState,useEffect,useMemo,useRef}=React;
const OUTCOMES=['No answer','Voicemail','Spoke','Not interested'];
function MapLink({c,size}){return <a href={opMapsUrl(c)} target="_blank" rel="noopener" onClick={e=>e.stopPropagation()} title="Open in Google Maps" style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:size||12,fontWeight:600,whiteSpace:'nowrap'}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"></path><circle cx="12" cy="9.5" r="2.5"></circle></svg>Maps</a>;}

function OpPill({dot,bg,fg,children,title}){return <span className="op-pill" title={title} style={{background:bg||'#f0eee9',color:fg||'#33302a'}}>{dot&&<span style={{width:7,height:7,borderRadius:'50%',background:dot,flexShrink:0}}></span>}{children}</span>;}
function OpField({label,children}){return <label style={{display:'flex',flexDirection:'column',gap:5}}><span className="op-lbl">{label}</span><div style={{display:'flex',gap:6,alignItems:'center'}}>{children}</div></label>;}
function NextPill({next}){if(!next)return null;const t=opYmd(),od=next<t,td=next===t;return <OpPill bg={od?'#fbe9e7':td?'#fff3d6':'#e6effb'} fg={od?'#a93226':td?'#8a6100':'#2b5ea8'}>{od?'Overdue · ':'Call back · '}{opNiceDate(next)}</OpPill>;}

function TodayView({st,byId,now,A,stageById,listDate,setListDate}){
  const S=st.settings,today=listDate,isToday=today===opYmd(now),ref=isToday?now:new Date(today+'T12:00:00'),T=(st.lists||{})[today]||null,myTz=S.myTz;
  const offMy=opOffset(myTz,ref),nowMy=isToday?opLocalMin(myTz,now):-1,pace=+S.pace||5;
  const items=T?T.items.filter(i=>byId.has(i.id)):[];
  const lastToday=id=>{const x=st.contacts[id];return x&&x.calls?x.calls.filter(k=>k.d===today).slice(-1)[0]:null;};
  const done=items.filter(i=>lastToday(i.id)).length;
  const groups=[];items.forEach(i=>{const h=Math.floor(i.at/60);let g=groups[groups.length-1];if(!g||g.h!==h)groups.push(g={h,items:[]});g.items.push(i);});
  const num=(k,w)=><input className="op-fld" type="number" min="1" value={S[k]} onChange={e=>A.setSettings({[k]:e.target.value})} style={{width:w||72}}/>;
  const time=k=><input className="op-fld" type="time" value={S[k]} onChange={e=>A.setSettings({[k]:e.target.value})} style={{width:118}}/>;
  const activeN=(st.active||[]).filter(id=>st.batches[id]).length;
  return <div style={{display:'flex',flexDirection:'column',gap:16,maxWidth:1100,margin:'0 auto',width:'100%'}}>
    <div className="op-card" style={{padding:'16px 18px',display:'flex',flexDirection:'column',gap:14}}>
      <div style={{display:'flex',gap:18,flexWrap:'wrap',alignItems:'flex-end'}}>
        <OpField label="List for"><input className="op-fld" type="date" min={opYmd(now)} value={today} onChange={e=>setListDate(e.target.value||opYmd(now))} style={{width:150}}/>{[['Today',0],['Tomorrow',1]].map(([l,n])=>{const d=opAddDays(n);return <button key={l} className="op-btn sm" onClick={()=>setListDate(d)} style={today===d?{background:'#1c1a17',color:'#fffefb'}:null}>{l}</button>;})}</OpField>
        <OpField label="Numbers">{num('daily')}</OpField>
        <OpField label="Their local time">{time('slotStart')}<span className="op-muted">to</span>{time('slotEnd')}</OpField>
        <OpField label={'My hours ('+opTzAbbr(myTz,now)+')'}>{time('myStart')}<span className="op-muted">to</span>{time('myEnd')}</OpField>
        <OpField label="Min per call">{num('pace',64)}</OpField>
        <OpField label="Retry no-answer after">{num('retryDays',56)}<span className="op-muted">days</span></OpField>
        <button className="op-btn gold" onClick={()=>A.buildToday(today)} style={{marginLeft:'auto'}}>{T?'Rebuild list':'Build list for '+(/^(Today|Tomorrow)$/.test(opNiceDate(today))?opNiceDate(today).toLowerCase():opNiceDate(today))}</button>
      </div>
      <div className="op-muted" style={{fontSize:12.5}}>{activeN?'From '+activeN+(activeN===1?' active batch':' active batches'):'From all batches, in order'} · recontacts due come first</div>
    </div>
    {!T&&<div className="op-card" style={{padding:28,textAlign:'center',color:'#8a857c'}}>No list for {/^(Today|Tomorrow)$/.test(opNiceDate(today))?opNiceDate(today).toLowerCase():opNiceDate(today)} yet.</div>}
    {T&&<div className="op-card" style={{overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 18px',borderBottom:'1px solid #eceae4',flexWrap:'wrap'}}>
        <div style={{fontWeight:700}}>{done} of {items.length} called</div>
        <div style={{flex:'1 1 160px',height:6,background:'#efede8',borderRadius:4,overflow:'hidden'}}><div style={{height:'100%',width:(items.length?done/items.length*100:0)+'%',background:'#ebae2b'}}></div></div>
        <div className="op-muted" style={{fontSize:12.5}}>{T.unfit?T.unfit+' more didn\u2019t fit their time window':''}</div>
      </div>
      {!items.length&&<div style={{padding:24,color:'#8a857c',fontSize:13.5}}>Nothing fits. Their window may have passed for today, or every number in the chosen batches has been called.</div>}
      {groups.map(g=><div key={g.h}>
        <div className="op-lbl" style={{padding:'10px 18px 6px',background:'#faf9f6',borderBottom:'1px solid #f0eee9'}}>{opFmtMin(g.h*60).replace(':00','')} your time</div>
        {g.items.map(i=>{const c=byId.get(i.id),x=st.contacts[i.id]||{},last=lastToday(i.id),theirs=i.at-offMy+opOffset(c.tz,ref),isNow=!last&&nowMy>=i.at&&nowMy<i.at+pace,stg=stageById[x.stage];
          return <div key={i.id} style={{display:'flex',gap:14,alignItems:'center',flexWrap:'wrap',padding:'10px 18px',borderBottom:'1px solid #f0eee9',background:isNow?'#fff8e6':'#fffefb',opacity:last?.7:1}}>
            <div style={{width:96,flexShrink:0}}><div style={{fontWeight:700,fontVariantNumeric:'tabular-nums'}}>{opFmtMin(i.at)}</div><div className="op-muted" style={{fontSize:11.5}}>{opFmtMin(theirs)} {opTzAbbr(c.tz,ref)}</div></div>
            <div style={{flex:'1 1 220px',minWidth:0}}>
              <button className="op-link" onClick={()=>A.open(i.id)}>{c.name}</button>
              <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap',marginTop:2}}><span className="op-muted" style={{fontSize:12}}>{c.city}{c.city?', ':''}{c.st}</span><MapLink c={c}/>{i.due&&<OpPill bg="#e6effb" fg="#2b5ea8">Recontact</OpPill>}{stg&&stg.role!=='new'&&stg.role!=='recontact'&&<OpPill dot={stg.dot}>{stg.name}</OpPill>}</div>
            </div>
            <a href={'tel:+1'+c.digits} style={{flex:'0 0 140px',fontWeight:600,fontVariantNumeric:'tabular-nums'}}>{c.phone}</a>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end',flex:'1 1 260px'}}>
              {last?<><OpPill bg="#e3f3e9" fg="#1f7a45">{'\u2713 '+last.o}</OpPill><NextPill next={x.next}/></>:OUTCOMES.map(o=><button key={o} className="op-btn sm" onClick={()=>A.logCall(i.id,o)}>{o}</button>)}
            </div>
          </div>;})}
      </div>)}
    </div>}
  </div>;
}

function PipelineView({st,pool,A,stages,stageOf,batchName}){
  const [q,setQ]=useState('');const [b,setB]=useState('');const [lim,setLim]=useState({});const [drag,setDrag]=useState(null);const [over,setOver]=useState(null);
  const cols=useMemo(()=>{const m={};stages.forEach(s=>m[s.id]=[]);const ql=q.trim().toLowerCase();
    pool.forEach(c=>{if(b&&st.assign[c.id]!==b)return;if(ql&&!(c.name+' '+c.city+' '+c.phone).toLowerCase().includes(ql))return;m[stageOf(c.id)].push(c);});
    Object.values(m).forEach(l=>l.sort((x,y)=>((st.contacts[y.id]||{}).updatedAt||0)-((st.contacts[x.id]||{}).updatedAt||0)||x.name.localeCompare(y.name)));return m;},[pool,st,q,b]);
  const bl=Object.values(st.batches).sort((x,y)=>x.order-y.order);
  return <div style={{display:'flex',flexDirection:'column',gap:14,height:'100%',minHeight:0}}>
    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
      <input className="op-fld" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name, city, phone" style={{flex:'1 1 220px',maxWidth:320}}/>
      <select className="op-fld" value={b} onChange={e=>setB(e.target.value)} style={{maxWidth:280}}><option value="">All batches</option>{bl.map(x=><option key={x.id} value={x.id}>{batchName(x)}</option>)}</select>
    </div>
    <div style={{flex:1,minHeight:0,overflowX:'auto',overflowY:'hidden'}}>
      <div style={{display:'flex',gap:14,height:'100%',alignItems:'stretch',minWidth:'min-content'}}>
        {stages.map(s=>{const list=cols[s.id]||[],n=lim[s.id]||60;
          return <div key={s.id} onDragOver={e=>{e.preventDefault();setOver(s.id);}} onDragLeave={()=>setOver(null)} onDrop={e=>{e.preventDefault();if(drag)A.setStage(drag,s.id);setDrag(null);setOver(null);}} style={{width:262,flexShrink:0,display:'flex',flexDirection:'column',background:'#efede8',borderRadius:14,border:'1.5px solid '+(over===s.id?'#ebae2b':'transparent')}}>
            <div style={{display:'flex',alignItems:'center',gap:8,padding:'13px 14px 11px'}}><span style={{width:9,height:9,borderRadius:'50%',background:s.dot}}></span><span style={{fontSize:13,fontWeight:700}}>{s.name}</span><span style={{fontSize:11.5,fontWeight:600,color:'#a39e94',background:'#e3e0d9',borderRadius:20,padding:'1px 7px'}}>{list.length.toLocaleString()}</span></div>
            <div style={{flex:1,overflowY:'auto',padding:'2px 10px 12px',display:'flex',flexDirection:'column',gap:8}}>
              {list.slice(0,n).map(c=>{const x=st.contacts[c.id]||{},last=x.calls&&x.calls[x.calls.length-1];
                return <div key={c.id} draggable="true" onDragStart={()=>setDrag(c.id)} onClick={()=>A.open(c.id)} className="op-kcard">
                  <div style={{fontSize:13.5,fontWeight:600,lineHeight:1.25}}>{c.name}</div>
                  <div className="op-muted" style={{fontSize:12,marginTop:2,display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}><span>{c.city}{c.city?', ':''}{c.st} · {c.phone}</span><MapLink c={c} size={11.5}/></div>
                  {(x.next||last)&&<div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:8}}><NextPill next={x.next}/>{last&&<span className="op-muted" style={{fontSize:11.5}}>{last.o} · {opNiceDate(last.d)}</span>}</div>}
                </div>;})}
              {list.length>n&&<button className="op-btn sm" onClick={()=>setLim(p=>({...p,[s.id]:n+100}))}>Show 100 more of {(list.length-n).toLocaleString()}</button>}
              {!list.length&&<div style={{border:'1.5px dashed #d8d5cf',borderRadius:11,padding:'18px 12px',textAlign:'center',fontSize:12,color:'#b0aba1',fontWeight:500}}>Drop here</div>}
            </div>
          </div>;})}
      </div>
    </div>
  </div>;
}

function BatchesView({st,members,A,stages,stageOf,batchName,byId}){
  const S=st.settings;const [q,setQ]=useState('');const [open,setOpen]=useState(null);const [arm,setArm]=useState(false);
  const active=new Set(st.active||[]),today=opYmd();
  const list=Object.values(st.batches).sort((a,b)=>a.order-b.order).filter(b=>{const ql=q.trim().toLowerCase();return !ql||(batchName(b)+' '+(members[b.id]||[]).map(c=>c.city).join(' ')).toLowerCase().includes(ql);});
  const changed=Object.values(st.batches).some(b=>b.mode!==S.batchBy);
  return <div style={{display:'flex',flexDirection:'column',gap:14,maxWidth:1100,margin:'0 auto',width:'100%'}}>
    <div className="op-card" style={{padding:'14px 18px',display:'flex',gap:18,flexWrap:'wrap',alignItems:'flex-end'}}>
      <OpField label="Batch by"><div style={{display:'flex',background:'#f0eee9',borderRadius:9,padding:3}}>{[['city','City'],['area','Area']].map(([v,l])=><button key={v} onClick={()=>A.setSettings({batchBy:v})} style={{border:'none',borderRadius:7,padding:'6px 14px',fontSize:13,fontWeight:600,background:S.batchBy===v?'#fffefb':'transparent',color:S.batchBy===v?'#1c1a17':'#8a857c',boxShadow:S.batchBy===v?'0 1px 2px rgba(28,26,23,.08)':'none'}}>{l}</button>)}</div></OpField>
      <OpField label="Numbers per batch"><input className="op-fld" type="number" min="1" value={S.batchSize} onChange={e=>A.setSettings({batchSize:e.target.value})} style={{width:80}}/></OpField>
      <button className="op-btn" onClick={()=>{if(!arm){setArm(true);return;}setArm(false);A.rebuild();}}>{arm?'Click again: regroup all numbers':'Rebuild batches'}</button>
      <input className="op-fld" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search batches or cities" style={{flex:'1 1 200px',maxWidth:280,marginLeft:'auto'}}/>
    </div>
    {changed&&<div className="op-muted" style={{fontSize:12.5}}>New settings apply to new numbers. Rebuild to regroup everything (stages, notes and call-backs are kept).</div>}
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {list.map(b=>{const m=members[b.id]||[],called=m.filter(c=>{const x=st.contacts[c.id];return x&&x.calls&&x.calls.length;}).length,rec=m.filter(c=>{const x=st.contacts[c.id];return x&&x.next;}),due=rec.filter(c=>st.contacts[c.id].next<=today).length,on=active.has(b.id);
        const cnt={};m.forEach(c=>{const s=stageOf(c.id);cnt[s]=(cnt[s]||0)+1;});
        const cities=b.mode==='area'?Object.entries(m.reduce((o,c)=>(o[c.city]=(o[c.city]||0)+1,o),{})).sort((x,y)=>y[1]-x[1]).slice(0,4).map(x=>x[0]).join(', '):'';
        return <div key={b.id} className="op-card" style={{overflow:'hidden'}}>
          <div style={{display:'flex',gap:14,alignItems:'center',flexWrap:'wrap',padding:'12px 16px'}}>
            <button onClick={()=>A.toggleActive(b.id)} title="Use in today's list" style={{border:'none',background:'none',fontSize:17,color:on?'#ebae2b':'#d8d5cf',padding:0,lineHeight:1}}>{on?'\u2605':'\u2606'}</button>
            <button onClick={()=>setOpen(open===b.id?null:b.id)} style={{flex:'1 1 220px',minWidth:0,textAlign:'left',background:'none',border:'none',padding:0}}>
              <div style={{fontWeight:700,fontSize:14}}>{batchName(b)}</div>
              <div className="op-muted" style={{fontSize:12}}>{m.length} numbers{cities?' · '+cities:''}</div>
            </button>
            <div style={{flex:'1 1 200px',display:'flex',flexDirection:'column',gap:5}}>
              <div style={{display:'flex',height:7,borderRadius:4,overflow:'hidden',background:'#efede8'}}>{stages.map(s=>cnt[s.id]?<div key={s.id} title={s.name+': '+cnt[s.id]} style={{width:(cnt[s.id]/m.length*100)+'%',background:s.dot}}></div>:null)}</div>
              <div className="op-muted" style={{fontSize:11.5}}>{called} of {m.length} called{rec.length?' · '+rec.length+' to recontact'+(due?' ('+due+' due)':''):''}</div>
            </div>
          </div>
          {open===b.id&&<div style={{borderTop:'1px solid #eceae4'}}>{m.slice().sort((x,y)=>x.name.localeCompare(y.name)).map(c=>{const x=st.contacts[c.id]||{},s=stages.find(z=>z.id===stageOf(c.id));
            return <div key={c.id} onClick={()=>A.open(c.id)} className="op-trow"><span style={{flex:'1 1 200px',fontWeight:600,minWidth:0}}>{c.name}</span><span className="op-muted" style={{flex:'0 1 140px'}}>{c.city}</span><span style={{flex:'0 0 130px',fontVariantNumeric:'tabular-nums'}}>{c.phone}</span><MapLink c={c}/><span style={{flex:'0 0 auto',display:'flex',gap:6}}><OpPill dot={s.dot}>{s.name}</OpPill><NextPill next={x.next}/></span></div>;})}</div>}
        </div>;})}
      {!list.length&&<div className="op-card" style={{padding:24,color:'#8a857c'}}>No batches match.</div>}
    </div>
  </div>;
}

function Drawer({id,st,byId,A,stages,stageOf,batchName,now,onClose}){
  const c=byId.get(id);const [note,setNote]=useState('');if(!c)return null;
  const x=st.contacts[id]||{},b=st.batches[st.assign[id]];
  const feed=[...(x.notes||[]).map(n=>({t:n.t,text:n.text,kind:'note'})),...(x.calls||[]).map(k=>({t:k.t,text:k.o,kind:'call'}))].sort((a,b)=>b.t-a.t);
  const add=()=>{if(!note.trim())return;A.addNote(id,note.trim());setNote('');};
  const chips=[['Tomorrow',1],['3 days',3],['1 week',7],['2 weeks',14],['1 month',30]];
  return <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(28,26,23,.28)',zIndex:50,display:'flex',justifyContent:'flex-end',animation:'fade .14s ease both'}}>
    <div onClick={e=>e.stopPropagation()} style={{width:460,maxWidth:'100%',height:'100%',background:'#fffefb',boxShadow:'-20px 0 60px rgba(28,26,23,.18)',display:'flex',flexDirection:'column',animation:'slide .2s ease both'}}>
      <div style={{padding:'20px 22px 16px',borderBottom:'1px solid #eceae4',display:'flex',gap:12,alignItems:'flex-start'}}>
        <div style={{flex:1,minWidth:0}}><div style={{fontSize:19,fontWeight:700,letterSpacing:'-.01em',lineHeight:1.2}}>{c.name}</div><div className="op-muted" style={{fontSize:12.5,marginTop:3}}>{[c.cat,b&&batchName(b)].filter(Boolean).join(' · ')}</div></div>
        <button onClick={onClose} style={{background:'none',border:'none',fontSize:22,lineHeight:1,color:'#a8a39a'}}>&times;</button>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'18px 22px',display:'flex',flexDirection:'column',gap:18}}>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          <a href={'tel:+1'+c.digits} style={{fontSize:20,fontWeight:700,fontVariantNumeric:'tabular-nums'}}>{c.phone}</a>
          <div className="op-muted" style={{fontSize:13}}>{opFmtMin(opLocalMin(c.tz,now))} {opTzAbbr(c.tz,now)} there now</div>
          <div style={{fontSize:13}}>{[c.street,c.city,[c.st,c.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')}</div>
          <div style={{display:'flex',gap:12,fontSize:13}}>{c.web&&<a href={c.web} target="_blank" rel="noopener">Website</a>}<a href={opMapsUrl(c)} target="_blank" rel="noopener">Google Maps</a></div>
          {c.alt.length>0&&<div className="op-muted" style={{fontSize:12}}>Same number also listed as {c.alt.join(', ')}</div>}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}><span className="op-lbl">Stage</span>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{stages.map(s=>{const on=stageOf(id)===s.id;return <button key={s.id} onClick={()=>A.setStage(id,s.id)} className="op-pill" style={{border:'1.5px solid '+(on?s.dot:'#e0ddd6'),background:on?'#fff':'#faf9f6',color:'#33302a',padding:'5px 10px',fontSize:12.5}}><span style={{width:7,height:7,borderRadius:'50%',background:s.dot}}></span>{s.name}</button>;})}</div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}><span className="op-lbl">Log a call</span>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{OUTCOMES.map(o=><button key={o} className="op-btn sm" onClick={()=>A.logCall(id,o,true)}>{o}</button>)}</div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}><span className="op-lbl">Call back</span>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
            <input type="date" className="op-fld" value={x.next||''} onChange={e=>A.setNext(id,e.target.value)} style={{width:160}}/>
            {chips.map(([l,n])=><button key={l} className="op-btn sm" onClick={()=>A.setNext(id,opAddDays(n))}>{l}</button>)}
            {x.next&&<button className="op-btn sm" onClick={()=>A.setNext(id,'')}>Clear</button>}
          </div>
          {x.next&&<div className="op-muted" style={{fontSize:12}}>Shows on the call list from {opNiceDate(x.next)}, and as Recontact in its batch.</div>}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}><span className="op-lbl">Notes</span>
          <div style={{display:'flex',gap:7}}><input className="op-fld" value={note} onChange={e=>setNote(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')add();}} placeholder="Who you spoke to, what they said\u2026" style={{flex:1}}/><button className="op-btn gold" onClick={add}>Add</button></div>
          <div style={{display:'flex',flexDirection:'column',gap:10,marginTop:4}}>
            {feed.map((f,i)=><div key={i} style={{display:'flex',gap:10}}>
              <span style={{width:7,height:7,borderRadius:'50%',background:f.kind==='call'?'#ebae2b':'#c4c0b8',marginTop:6,flexShrink:0}}></span>
              <div style={{flex:1}}><div style={{fontSize:13,lineHeight:1.45,color:'#33302a',fontWeight:f.kind==='call'?600:400}}>{f.kind==='call'?'Called \u00b7 '+f.text:f.text}</div><div style={{fontSize:11.5,color:'#a39e94',marginTop:1}}>{opStamp(f.t)}</div></div>
            </div>)}
            {!feed.length&&<div style={{fontSize:12,color:'#b0aba1',fontStyle:'italic'}}>No calls or notes yet.</div>}
          </div>
        </div>
      </div>
    </div>
  </div>;
}

function StagesModal({stages,onSave,onClose}){
  const [d,setD]=useState(stages.map(s=>({...s})));
  const set=(i,p)=>setD(l=>l.map((s,j)=>j===i?{...s,...p}:s));
  const move=(i,k)=>setD(l=>{const n=l.slice(),j=i+k;if(j<0||j>=n.length)return l;[n[i],n[j]]=[n[j],n[i]];return n;});
  const roleName={new:'New numbers start here',recontact:'Call-backs',closed:'Closed'};
  return <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(28,26,23,.34)',zIndex:60,display:'flex',alignItems:'center',justifyContent:'center',padding:24,animation:'fade .14s ease both'}}>
    <div onClick={e=>e.stopPropagation()} className="op-card" style={{width:520,maxWidth:'100%',maxHeight:'90vh',overflow:'auto',padding:22,display:'flex',flexDirection:'column',gap:12,borderRadius:18,boxShadow:'0 28px 70px rgba(28,26,23,.26)'}}>
      <div style={{fontSize:17,fontWeight:700}}>Stages</div>
      {d.map((s,i)=><div key={s.id} style={{display:'flex',gap:8,alignItems:'center'}}>
        <button title="Change colour" onClick={()=>set(i,{dot:OP_PALETTE[(OP_PALETTE.indexOf(s.dot)+1)%OP_PALETTE.length]})} style={{width:18,height:18,borderRadius:'50%',border:'none',background:s.dot,flexShrink:0}}></button>
        <input className="op-fld" value={s.name} onChange={e=>set(i,{name:e.target.value})} style={{flex:1}}/>
        {s.role&&<span className="op-muted" style={{fontSize:11.5,width:120}}>{roleName[s.role]}</span>}
        <button className="op-btn sm" onClick={()=>move(i,-1)}>&uarr;</button><button className="op-btn sm" onClick={()=>move(i,1)}>&darr;</button>
        {!s.role&&<button className="op-btn sm" onClick={()=>setD(l=>l.filter((_,j)=>j!==i))} style={{color:'#a93226'}}>&times;</button>}
      </div>)}
      <button className="op-btn sm" style={{alignSelf:'flex-start'}} onClick={()=>setD(l=>{const n=l.slice(),ci=n.findIndex(s=>s.role==='closed');n.splice(ci<0?n.length:ci,0,{id:'s'+Date.now().toString(36),name:'New stage',dot:'#7b5cc4'});return n;})}>+ Add stage</button>
      <div className="op-muted" style={{fontSize:12}}>Numbers in a deleted stage move back to the first stage.</div>
      <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}><button className="op-btn" onClick={onClose}>Cancel</button><button className="op-btn gold" onClick={()=>onSave(d.map(s=>({...s,name:s.name.trim()||'Untitled'})))}>Save</button></div>
    </div>
  </div>;
}

function OutreachApp(){
  const [st,setSt]=useState(null);const [pool,setPool]=useState([]);const [tab,setTab]=useState(()=>localStorage.getItem('op-tab')||'today');
  const [openId,setOpenId]=useState(null);const [sync,setSync]=useState('');const [toast,setToast]=useState('');const [stagesOpen,setStagesOpen]=useState(false);const [now,setNow]=useState(new Date());const [listDate,setListDate]=useState(opYmd());
  const tRef=useRef();const flash=m=>{setToast(m);clearTimeout(tRef.current);tRef.current=setTimeout(()=>setToast(''),2800);};
  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),30000);return ()=>clearInterval(t);},[]);
  useEffect(()=>{localStorage.setItem('op-tab',tab);},[tab]);
  useEffect(()=>{(async()=>{
    if(window.BOTAuth)await BOTAuth.ready;const u=window.BOTAuth&&BOTAuth.current();
    let local=null;try{local=JSON.parse(localStorage.getItem(OP_KEY)||'null');}catch(e){}
    let cloud=null;try{cloud=await OPCloud.load();setSync(u?'cloud':'local');}catch(e){setSync('err');}
    let s=opMigrate((cloud&&(!local||(cloud.updated||0)>=(local.updated||0)))?cloud:(local||opDefaultState()));
    const p=opBuildPool(await opLoadLibrary(u&&u.uid));const a=opAssign(p,s,false);if(a)s={...s,...a,updated:Date.now()};
    setPool(p);setSt(s);
  })();},[]);
  useEffect(()=>{if(!st)return;const t=setTimeout(async()=>{try{localStorage.setItem(OP_KEY,JSON.stringify(st));}catch(e){}try{const ok=await OPCloud.save(st);setSync(ok?'cloud':'local');}catch(e){setSync('err');}},1500);return ()=>clearTimeout(t);},[st]);
  const byId=useMemo(()=>new Map(pool.map(c=>[c.id,c])),[pool]);
  const members=useMemo(()=>{const m={};if(!st)return m;pool.forEach(c=>{const b=st.assign[c.id];(m[b]||(m[b]=[])).push(c);});return m;},[pool,st&&st.assign]);
  if(!st)return <div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'#8a857c',fontSize:13}}>Loading the Library&hellip;</div>;
  const stages=st.stages,stageById=Object.fromEntries(stages.map(s=>[s.id,s])),R=opRoles(stages);
  const stageOf=id=>{const x=st.contacts[id];return x&&stageById[x.stage]?x.stage:R.first;};
  const batchName=b=>{if(!b)return '';const sib=Object.values(st.batches).filter(x=>x.group===b.group&&x.mode===b.mode).length;return b.mode==='area'?b.group+' \u00b7 Area '+b.n:b.group+(sib>1?' \u00b7 '+b.n:'');};
  const upd=fn=>setSt(p=>{const n={...p,contacts:{...p.contacts}};fn(n);n.updated=Date.now();return n;});
  const patchC=(id,fn)=>upd(n=>{const x={...(n.contacts[id]||{})};fn(x,n);x.updatedAt=Date.now();n.contacts[id]=x;});
  const A={
    open:setOpenId,
    setSettings:p=>upd(n=>{n.settings={...n.settings,...p};}),
    logCall:(id,o,inDrawer)=>{patchC(id,(x,n)=>{x.calls=[...(x.calls||[]),{t:Date.now(),d:opYmd(),o}];const cur=stageById[x.stage]?x.stage:R.first;
      if(o==='No answer'||o==='Voicemail'){if(cur===R.first||cur===R.rec)x.stage=R.rec;x.next=opAddDays(+n.settings.retryDays||2);}
      else if(o==='Spoke'){if(cur===R.first||cur===R.rec)x.stage=R.spoke;if(x.next&&x.next<=opYmd())x.next='';}
      else{x.stage=R.closed;x.next='';}});
      if(o==='Spoke'&&!inDrawer)setOpenId(id);},
    setStage:(id,s)=>patchC(id,(x,n)=>{x.stage=s;if(s===R.rec&&!x.next)x.next=opAddDays(+n.settings.retryDays||2);if(s===R.closed)x.next='';}),
    setNext:(id,d)=>patchC(id,x=>{x.next=d;const cur=stageById[x.stage]?x.stage:R.first;if(d&&cur===R.first)x.stage=R.rec;}),
    addNote:(id,text)=>patchC(id,x=>{x.notes=[...(x.notes||[]),{t:Date.now(),text}];}),
    toggleActive:id=>upd(n=>{const s=new Set(n.active||[]);s.has(id)?s.delete(id):s.add(id);n.active=[...s];}),
    rebuild:()=>{upd(n=>{const a=opAssign(pool,n,true);n.assign=a.assign;n.batches=a.batches;n.active=[];});flash('Batches rebuilt');},
    buildToday:D=>upd(n=>{const lists={...(n.lists||{})},cur=lists[D],realToday=opYmd(),called=(id,d)=>{const x=n.contacts[id];return x&&x.calls&&x.calls.some(k=>k.d===d);};
      const prev=cur?cur.items.filter(i=>called(i.id,D)):[],ex=new Set(prev.map(i=>i.id));
      Object.entries(lists).forEach(([d,l])=>{if(d!==D&&d>=realToday)l.items.forEach(i=>{if(!called(i.id,d))ex.add(i.id);});});
      const t=opBuildToday(pool,n,new Date(),ex,Math.max(0,(+n.settings.daily||40)-prev.length),D);t.items=prev.concat(t.items).sort((a,b)=>a.at-b.at);lists[D]=t;
      const cut=opAddDays(-14);Object.keys(lists).forEach(d=>{if(d<cut)delete lists[d];});n.lists=lists;delete n.today;})
  };
  const syncLib=async()=>{setSync('loading');const u=window.BOTAuth&&BOTAuth.current();const p=opBuildPool(await opLoadLibrary(u&&u.uid));const a=opAssign(p,st,false);const added=p.length-pool.length;
    setPool(p);if(a)upd(n=>{n.assign=a.assign;n.batches=a.batches;});setSync('cloud');flash(added>0?added+' new numbers added to batches':'Up to date');};
  const today=opYmd(now),dueN=pool.filter(c=>{const x=st.contacts[c.id];return x&&x.next&&x.next<=today&&stageOf(c.id)!==R.closed;}).length;
  const calledN=pool.filter(c=>{const x=st.contacts[c.id];return x&&x.calls&&x.calls.length;}).length;
  const tabs=[['today','Today'],['pipeline','Pipeline'],['batches','Batches']];
  return <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
    <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'10px 16px',flexWrap:'wrap',padding:'14px 28px 0',background:'#fffefb',borderBottom:'1px solid #e8e5df',flexShrink:0}}>
      <div><div style={{fontSize:16,fontWeight:700,letterSpacing:'-.01em'}}>Outreach Planner</div><div style={{fontSize:12,color:'#8a857c',fontWeight:500}}>{pool.length.toLocaleString()} numbers{opBuildPool.churches?' ('+opBuildPool.churches.toLocaleString()+' non-Islamic left out)':''} · {calledN.toLocaleString()} called · {dueN} call-backs due{sync==='err'?' · not backed up':''}</div></div>
      <div style={{display:'flex',gap:9}}><button className="op-btn" onClick={()=>setStagesOpen(true)}>Edit stages</button><button className="op-btn" onClick={syncLib}>{sync==='loading'?'Syncing\u2026':'Sync from Library'}</button></div>
      <nav style={{display:'flex',gap:22,width:'100%'}}>{tabs.map(([v,l])=><button key={v} className={'op-tab'+(tab===v?' on':'')} onClick={()=>setTab(v)}>{l}</button>)}</nav>
    </header>
    <main style={{flex:1,minHeight:0,overflow:tab==='pipeline'?'hidden':'auto',padding:20,display:'flex',flexDirection:'column'}}>
      {!pool.length?<div className="op-card" style={{padding:28,color:'#8a857c',maxWidth:600,margin:'0 auto'}}>No phone numbers in the City Place Finder Library yet.</div>:
        tab==='today'?<TodayView st={st} byId={byId} now={now} A={A} stageById={stageById} listDate={listDate<opYmd(now)?opYmd(now):listDate} setListDate={setListDate}/>:
        tab==='pipeline'?<PipelineView st={st} pool={pool} A={A} stages={stages} stageOf={stageOf} batchName={batchName}/>:
        <BatchesView st={st} members={members} A={A} stages={stages} stageOf={stageOf} batchName={batchName} byId={byId}/>}
    </main>
    {openId&&<Drawer key={openId} id={openId} st={st} byId={byId} A={A} stages={stages} stageOf={stageOf} batchName={batchName} now={now} onClose={()=>setOpenId(null)}/>}
    {stagesOpen&&<StagesModal stages={stages} onClose={()=>setStagesOpen(false)} onSave={d=>{upd(n=>{n.stages=d;});setStagesOpen(false);flash('Stages saved');}}/>}
    {toast&&<div style={{position:'fixed',bottom:22,left:'50%',transform:'translateX(-50%)',background:'#1c1a17',color:'#fffefb',padding:'9px 16px',borderRadius:9,fontSize:13,fontWeight:600,zIndex:80}}>{toast}</div>}
  </div>;
}
ReactDOM.createRoot(document.getElementById('root')).render(<OutreachApp/>);
