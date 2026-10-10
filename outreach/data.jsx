const OP_KEY='op-state-v1';
const OP_PALETTE=['#a39e94','#3b7dd8','#ebae2b','#d9822b','#c0392b','#2e9e5b','#7b5cc4','#5f5a50'];
const OP_STAGES=[{id:'tocall',name:'To call',dot:'#a39e94',role:'new'},{id:'recontact',name:'Recontact',dot:'#3b7dd8',role:'recontact'},{id:'spoke',name:'Spoke',dot:'#ebae2b'},{id:'warm',name:'Warm',dot:'#d9822b'},{id:'hot',name:'Hot',dot:'#c0392b'},{id:'no',name:'Not interested',dot:'#5f5a50',role:'closed'}];
function opDefaultState(){return {v:1,stages:OP_STAGES,settings:{batchBy:'city',batchSize:25,daily:40,slotStart:'10:00',slotEnd:'12:00',myStart:'09:00',myEnd:'17:00',pace:5,retryDays:2,myTz:Intl.DateTimeFormat().resolvedOptions().timeZone},contacts:{},assign:{},batches:{},active:[],today:null,updated:0};}
function opMigrate(s){const d=opDefaultState();return {...d,...s,settings:{...d.settings,...(s.settings||{})},stages:(s.stages&&s.stages.length)?s.stages:d.stages,contacts:s.contacts||{},assign:s.assign||{},batches:s.batches||{},active:s.active||[],lists:s.lists||(s.today&&s.today.date?{[s.today.date]:s.today}:{})};}

const opHM=s=>{const [h,m]=(s||'0:0').split(':').map(Number);return (h||0)*60+(m||0);};
const opFmtMin=m=>{m=((Math.round(m)%1440)+1440)%1440;const h=Math.floor(m/60),mm=m%60;return ((h%12)||12)+':'+String(mm).padStart(2,'0')+(h<12?' AM':' PM');};
const _opDtf={};
function opParts(tz,d){const f=_opDtf[tz]||(_opDtf[tz]=new Intl.DateTimeFormat('en-US',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}));const o={};f.formatToParts(d).forEach(p=>o[p.type]=p.value);return o;}
function opOffset(tz,d){const o=opParts(tz,d);return Math.round((Date.UTC(+o.year,+o.month-1,+o.day,+o.hour%24,+o.minute)-Math.floor(d.getTime()/60000)*60000)/60000);}
function opLocalMin(tz,d){const o=opParts(tz,d);return (+o.hour%24)*60+(+o.minute);}
const _opAbbr={};
function opTzAbbr(tz,d){if(_opAbbr[tz])return _opAbbr[tz];try{return _opAbbr[tz]=new Intl.DateTimeFormat('en-US',{timeZone:tz,timeZoneName:'short'}).formatToParts(d).find(p=>p.type==='timeZoneName').value;}catch(e){return tz;}}
const opMapsUrl=c=>c.maps||('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([c.name,c.street,c.city,c.st].filter(Boolean).join(', '))+(c.id?'&query_place_id='+encodeURIComponent(c.id):''));
const opYmd=(d=new Date())=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const opAddDays=(n,from)=>{const d=from?new Date(from+'T12:00:00'):new Date();d.setDate(d.getDate()+n);return opYmd(d);};
const opNiceDate=s=>{if(!s)return '';if(s===opYmd())return 'Today';if(s===opAddDays(1))return 'Tomorrow';if(s===opAddDays(-1))return 'Yesterday';return new Date(s+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});};
const opStamp=t=>new Date(t).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});

const OP_TZ={AL:'America/Chicago',AK:'America/Anchorage',AZ:'America/Phoenix',AR:'America/Chicago',CA:'America/Los_Angeles',CO:'America/Denver',CT:'America/New_York',DE:'America/New_York',DC:'America/New_York',FL:'America/New_York',GA:'America/New_York',HI:'Pacific/Honolulu',ID:'America/Boise',IL:'America/Chicago',IN:'America/Indiana/Indianapolis',IA:'America/Chicago',KS:'America/Chicago',KY:'America/New_York',LA:'America/Chicago',ME:'America/New_York',MD:'America/New_York',MA:'America/New_York',MI:'America/Detroit',MN:'America/Chicago',MS:'America/Chicago',MO:'America/Chicago',MT:'America/Denver',NE:'America/Chicago',NV:'America/Los_Angeles',NH:'America/New_York',NJ:'America/New_York',NM:'America/Denver',NY:'America/New_York',NC:'America/New_York',ND:'America/Chicago',OH:'America/New_York',OK:'America/Chicago',OR:'America/Los_Angeles',PA:'America/New_York',RI:'America/New_York',SC:'America/New_York',SD:'America/Chicago',TN:'America/Chicago',TX:'America/Chicago',UT:'America/Denver',VT:'America/New_York',VA:'America/New_York',WA:'America/Los_Angeles',WV:'America/New_York',WI:'America/Chicago',WY:'America/Denver',AB:'America/Edmonton',BC:'America/Vancouver',MB:'America/Winnipeg',NB:'America/Moncton',NL:'America/St_Johns',NS:'America/Halifax',NT:'America/Yellowknife',NU:'America/Iqaluit',ON:'America/Toronto',PE:'America/Halifax',QC:'America/Toronto',SK:'America/Regina',YT:'America/Whitehorse'};
function opTzFor(st,lat,lng){
  if(st==='TX'&&lng<-104.9)return 'America/Denver';
  if(st==='FL'&&lng<-85.0&&lat>29.5)return 'America/Chicago';
  if(st==='TN'&&lng>-85.3)return 'America/New_York';
  if(st==='KY'&&lng<-86.0)return 'America/Chicago';
  if(st==='IN'&&((lat>41.0&&lng<-86.8)||(lat<38.4&&lng<-86.9)))return 'America/Chicago';
  if(st==='MI'&&lng<-87.6&&lat>45.3)return 'America/Menominee';
  if((st==='ND'||st==='NE'||st==='KS')&&lng<-101.5)return 'America/Denver';
  if(st==='SD'&&lng<-100.5)return 'America/Denver';
  if(st==='OR'&&lng>-117.7&&lat<44.5)return 'America/Boise';
  if(st==='ID'&&lat>45.6)return 'America/Los_Angeles';
  if(st==='ON'&&lng<-90)return 'America/Winnipeg';
  if(st==='BC'&&lng>-117.6&&lat<50.5)return 'America/Edmonton';
  return OP_TZ[st]||'America/New_York';
}

function opIdbAll(){return new Promise(res=>{try{const r=indexedDB.open('cpf-library',1);r.onupgradeneeded=()=>{try{r.result.createObjectStore('runs',{keyPath:'id'});}catch(e){}};r.onsuccess=()=>{try{const q=r.result.transaction('runs').objectStore('runs').getAll();q.onsuccess=()=>res(q.result||[]);q.onerror=()=>res([]);}catch(e){res([]);}};r.onerror=()=>res([]);}catch(e){res([]);}});}
async function opLoadLibrary(uid){
  const have=new Map();
  try{const j=JSON.parse(localStorage.getItem('cpf-library-v1')||'null');if(j&&j.runs)j.runs.forEach(r=>have.set(r.id,r));}catch(e){}
  (await opIdbAll()).forEach(r=>{if(!have.has(r.id))have.set(r.id,r);});
  try{if(uid&&window.firebase&&firebase.firestore){const col=firebase.firestore().collection('cpf').doc(uid).collection('runs');const q=await col.get();
    for(const d of q.docs){const m=d.data();if(have.has(m.id))continue;let s='';for(let i=0;i<m.parts;i++){const p=await col.doc(m.id).collection('parts').doc(String(i)).get();s+=p.exists?p.data().s:'';}try{have.set(m.id,JSON.parse(s));}catch(e){}}}}catch(e){}
  return [...have.values()].filter(r=>r.live);
}
const OP_CHURCH=/\b(church|churches|chapel|cathedral|basilica|parish|ministr(y|ies)|baptist|methodist|lutheran|presbyterian|episcopal|catholic|pentecostal|evangelical|christian|christ|jesus|gospel|bible|tabernacle|adventist|latter[- ]day|lds|mormon|kingdom hall|jehovah|assembl(y|ies) of god|apostolic|nazarene|anglican|diocese)\b/i;
const OP_ISLAMIC=/masjid|mosque|musjid|musall|islam|muslim|moslem|ismaili|jamatkhana|minaret|quran|qur.an|koran|madras|jami|jame\b|hifz|tahf|dawah|da.wah|ummah|jamat|jamaat|imam|sunnah|darul|dar[ -]?al|dar[ -]?ul|dar[ -]as|markaz|maktab|ahmadiyya|zawiya|khanqah|tawh[ei]ed|tauheed|taqwa|furqan|icna|isna|\bmas\b|ithna|imamia|husain|hussain|huss?eini|ahlul|ahl al|baitul|bait ul|tablighi|ikhlas|hijra|salat/i;
const OP_SOFT=/^(al|el|an|as|ad|ar|at|az)[- ]|\b(al|el)-\w+|\b(salam|salaam|dar|dār|darus|darussalam|imani|hikmah|hidayah|huda|houda|noor|nour|nur|madinah|madina|medina|risala|qalam|falah|fajr|amal|iman|eman|ameen|amin|mustafa|mahdi|zahra|zainab|rahma|rahmah|barakah|hijrah|deen|ilm|bayan|kawthar|minhaj|siraj|ihsan|tawba|sabr|nasr|rashid|rasheed|bilal|omar|umar|uthman|abu bakr|khadija|aisha|fatima|fatimah|hamza|ibrahim|yusuf|ismail|zakariya|maryam|ummaty|sabeel|hadi|najm|njoom|muna)\b/i;
const OP_OK_CAT=/mosque|school|academy|educational|institute|community cent|place of worship|religious|association|organization|non-profit|nonprofit|charity|learning|tutoring|cultural|point of interest|^$/i;
const OP_BAD_CAT=/travel|store|shop|clinic|medical|hospital|doctor|dentist|pharmacy|restaurant|grocery|market|bank|sports|real estate|insurance|funeral|cemetery|hotel|salon|clothing|book|cafe|bakery|butcher|car |auto|lawyer|attorney|account|food|supermarket|catering|gym|fitness|child care|day ?care|preschool|kindergarten|university|college|veteran|government|police|park|library|museum|church|synagogue|hindu|temple|gurdwara|sikh|buddhist/i;
const opIsIslamic=p=>{const n=p.name||'',c=p.cat||'';if(/mosque/i.test(c))return true;if(/masjid|mosque|musjid|quran|qur.an|hifz|tahf|madras/i.test(n)&&!/store|shop|clothing|book|funeral|travel|child care|day ?care/i.test(c))return true;if(OP_BAD_CAT.test(c))return false;if(OP_ISLAMIC.test(n))return true;return OP_SOFT.test(n)&&OP_OK_CAT.test(c);};
const opIsChurch=p=>!opIsIslamic(p);
function opBuildPool(runs){
  const byId=new Map();opBuildPool.churches=0;
  runs.slice().sort((a,b)=>a.date.localeCompare(b.date)).forEach(r=>(r.results||[]).forEach(x=>(x.rows||[]).forEach(y=>byId.set(y.id,{...(byId.get(y.id)||{}),...y}))));
  const byPhone=new Map(),out=[];
  for(const p of byId.values()){
    if(p.status==='Permanently closed')continue;
    if(opIsChurch(p)){opBuildPool.churches=(opBuildPool.churches||0)+1;continue;}
    const d=(p.phone||'').replace(/\D/g,'');if(d.length<10)continue;const k=d.slice(-10),ex=byPhone.get(k);
    if(ex){if(!ex.alt.includes(p.name)&&p.name!==ex.name)ex.alt.push(p.name);continue;}
    const c={id:p.id,name:p.name||'(no name)',phone:p.phone,digits:k,web:p.web||'',maps:p.maps||'',street:p.street||'',city:p.city||'',st:p.st||'',zip:p.zip||'',lat:+p.lat||0,lng:+p.lng||0,cat:p.cat||'',alt:[]};
    c.tz=opTzFor(c.st,c.lat,c.lng);byPhone.set(k,c);out.push(c);
  }
  return out;
}
function opZ(c,b){const x=Math.min(1023,Math.max(0,Math.floor((c.lng-b.w)/((b.e-b.w)||1)*1023))),y=Math.min(1023,Math.max(0,Math.floor((c.lat-b.s)/((b.n-b.s)||1)*1023)));let z=0;for(let i=0;i<10;i++){z|=((x>>i)&1)<<(2*i);z|=((y>>i)&1)<<(2*i+1);}return z;}
function opAssign(pool,st,rebuild){
  const S=st.settings,N=Math.max(1,+S.batchSize||25),mode=S.batchBy;
  const assign=rebuild?{}:{...st.assign},batches=rebuild?{}:{...st.batches};
  let order=Object.values(batches).reduce((m,b)=>Math.max(m,b.order||0),0);
  const todo=pool.filter(c=>!assign[c.id]||!batches[assign[c.id]]);
  if(!todo.length&&!rebuild)return null;
  const gk=c=>mode==='area'?(c.st||'?'):((c.city||'?')+', '+(c.st||''));
  const groups=new Map();todo.forEach(c=>{const k=gk(c);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(c);});
  const counts={};Object.values(assign).forEach(b=>counts[b]=(counts[b]||0)+1);
  const keys=[...groups.keys()].sort((a,b)=>groups.get(b).length-groups.get(a).length);
  for(const k of keys){
    let list=groups.get(k);
    if(mode==='area'){const bb={s:90,w:180,n:-90,e:-180};list.forEach(c=>{bb.s=Math.min(bb.s,c.lat);bb.n=Math.max(bb.n,c.lat);bb.w=Math.min(bb.w,c.lng);bb.e=Math.max(bb.e,c.lng);});list=list.map(c=>[opZ(c,bb),c]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);}
    else list=list.slice().sort((a,b)=>a.name.localeCompare(b.name));
    const sibs=()=>Object.values(batches).filter(b=>b.group===k&&b.mode===mode);
    let open=sibs().filter(b=>(counts[b.id]||0)<N).sort((a,b)=>a.order-b.order)[0],idx=sibs().length;
    for(const c of list){
      if(!open||(counts[open.id]||0)>=N){idx++;open={id:mode+':'+k+':'+idx+':'+Date.now().toString(36),group:k,mode,n:idx,order:++order};batches[open.id]=open;}
      assign[c.id]=open.id;counts[open.id]=(counts[open.id]||0)+1;
    }
  }
  return {assign,batches};
}
function opRoles(stages){return {first:(stages.find(s=>s.role==='new')||stages[0]).id,rec:(stages.find(s=>s.role==='recontact')||stages[1]||stages[0]).id,closed:(stages.find(s=>s.role==='closed')||stages[stages.length-1]).id,spoke:(stages.find(s=>!s.role)||stages[0]).id};}
function opBuildToday(pool,st,now,exclude,want,dateStr){
  const S=st.settings,C=st.contacts,today=dateStr||opYmd(now),isToday=today===opYmd(now),ref=isToday?now:new Date(today+'T12:00:00'),myTz=S.myTz,R=opRoles(st.stages),ids=new Set(st.stages.map(s=>s.id));
  const offMy=opOffset(myTz,ref),nowMy=isToday?opLocalMin(myTz,now):0,myA=opHM(S.myStart),myB=opHM(S.myEnd),pace=Math.max(1,+S.pace||5);
  const nSlots=Math.max(0,Math.floor((myB-myA)/pace)),used=new Array(nSlots).fill(false),win={};
  const winFor=tz=>{if(win[tz])return win[tz];const off=opOffset(tz,ref),a=opHM(S.slotStart)-off+offMy,b=opHM(S.slotEnd)-off+offMy;return win[tz]={a:Math.max(a,myA,nowMy),b:Math.min(b,myB)};};
  const active=new Set(st.active||[]),useActive=active.size>0,rank={};
  Object.values(st.batches).sort((a,b)=>a.order-b.order).forEach((b,i)=>rank[b.id]=i);
  const due=[],fresh=[];let unfit=0;
  pool.forEach(c=>{
    if(exclude.has(c.id))return;const x=C[c.id]||{},stg=ids.has(x.stage)?x.stage:R.first;
    if(stg===R.closed)return;if(x.calls&&x.calls.some(k=>k.d===today))return;
    if(x.next&&x.next<=today)due.push(c);
    else if(!x.next&&stg===R.first&&!(x.calls&&x.calls.length)){if(useActive&&!active.has(st.assign[c.id]))return;fresh.push(c);}
  });
  due.sort((a,b)=>C[a.id].next.localeCompare(C[b.id].next));
  fresh.sort((a,b)=>((rank[st.assign[a.id]]??1e9)-(rank[st.assign[b.id]]??1e9))||a.name.localeCompare(b.name));
  const items=[];
  for(const c of due.concat(fresh)){
    if(items.length>=want)break;const w=winFor(c.tz);
    if(w.b-w.a<pace){unfit++;continue;}
    const i0=Math.max(0,Math.ceil((w.a-myA)/pace)),i1=Math.min(nSlots-1,Math.floor((w.b-myA)/pace)-1);let placed=false;
    for(let i=i0;i<=i1;i++)if(!used[i]){used[i]=true;items.push({id:c.id,at:myA+i*pace,due:!!(C[c.id]&&C[c.id].next)});placed=true;break;}
    if(!placed)unfit++;
  }
  return {date:today,items,built:Date.now(),dueN:due.length,freshN:fresh.length,unfit};
}
const OPCloud={
  ref(){const u=window.BOTAuth&&BOTAuth.current();if(!u||!window.firebase||!firebase.firestore)return null;return firebase.firestore().collection('cpf').doc(u.uid).collection('outreach').doc('state');},
  async load(){const d=this.ref();if(!d)return null;const m=await d.get();if(!m.exists)return null;const meta=m.data();let s='';for(let i=0;i<meta.parts;i++){const p=await d.collection('parts').doc(String(i)).get();s+=p.exists?p.data().s:'';}return JSON.parse(s);},
  async save(state){const d=this.ref();if(!d)return false;const s=JSON.stringify(state),N=700000,parts=[];for(let i=0;i<s.length;i+=N)parts.push(s.slice(i,i+N));for(let i=0;i<parts.length;i++)await d.collection('parts').doc(String(i)).set({s:parts[i]});await d.set({parts:parts.length,updated:state.updated||Date.now()});return true;}
};
Object.assign(window,{opMapsUrl,OP_KEY,OP_PALETTE,OP_STAGES,opDefaultState,opMigrate,opHM,opFmtMin,opOffset,opLocalMin,opTzAbbr,opYmd,opAddDays,opNiceDate,opStamp,opLoadLibrary,opBuildPool,opAssign,opRoles,opBuildToday,OPCloud});
