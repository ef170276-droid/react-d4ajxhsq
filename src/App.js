import { useState, useEffect, useRef } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const CATEGORIES = ["Alimentação","Transporte","Saúde","Moradia","Lazer","Roupas","Eletrônicos","Casa","Compras Online","Educação","Contas de Casa","Outros"];
const PAYMENTS = ["Pix","Débito","Crédito","Dinheiro","Boleto","Débito Automático"];
const PRIORITIES = ["Essencial","Importante","Lazer"];
const CAT_COLORS = {"Alimentação":"#f97316","Transporte":"#3b82f6","Saúde":"#22c55e","Moradia":"#a855f7","Lazer":"#ec4899","Roupas":"#f43f5e","Eletrônicos":"#06b6d4","Casa":"#84cc16","Compras Online":"#eab308","Educação":"#8b5cf6","Contas de Casa":"#38bdf8","Outros":"#94a3b8"};
const STORES = {amazon:{label:"Amazon",icon:"📦",cat:"Compras Online"},walmart:{label:"Walmart",icon:"🛒",cat:"Compras Online"},temu:{label:"Temu",icon:"🎁",cat:"Compras Online"},shein:{label:"Shein",icon:"👗",cat:"Roupas"},homedepot:{label:"Home Depot",icon:"🔨",cat:"Casa"}};
const DEFAULT_BILLS = [
  {id:"internet",name:"Internet",icon:"📶",color:"#38bdf8",value:"",dueDay:"10",payment:"Débito Automático",active:true},
  {id:"luz",name:"Luz",icon:"💡",color:"#f59e0b",value:"",dueDay:"15",payment:"Boleto",active:true},
  {id:"agua",name:"Água",icon:"💧",color:"#3b82f6",value:"",dueDay:"20",payment:"Boleto",active:true},
  {id:"lixo",name:"Lixo",icon:"🗑️",color:"#22c55e",value:"",dueDay:"25",payment:"Boleto",active:true},
  {id:"tv",name:"TV Assinatura",icon:"📺",color:"#a855f7",value:"",dueDay:"5",payment:"Débito Automático",active:true},
];

const fmt = v => v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const today = () => new Date().toISOString().split("T")[0];
const monthKey = () => { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; };

const C = {
  bg: "#f1f5f9",
  card: "#ffffff",
  border: "#e2e8f0",
  text: "#1e293b",
  sub: "#64748b",
  muted: "#94a3b8",
  input: "#f8fafc",
  primary: "#7c3aed",
  primaryLight: "#ede9fe",
};

const iStyle = {width:"100%",padding:"8px 10px",borderRadius:"8px",border:`1px solid ${C.border}`,background:C.input,color:C.text,fontSize:"13px",boxSizing:"border-box"};

function Field({label,children}){
  return <div><label style={{display:"block",marginBottom:"3px",fontSize:"12px",color:C.sub}}>{label}</label>{children}</div>;
}

function MiniCard({title,value,sub,gradient}){
  return(
    <div style={{background:gradient,borderRadius:"12px",padding:"12px 14px",flex:1}}>
      <p style={{margin:"0 0 2px",color:"rgba(255,255,255,0.75)",fontSize:"11px"}}>{title}</p>
      <p style={{margin:"0 0 1px",fontSize:"18px",fontWeight:"700",color:"#fff"}}>{value}</p>
      <p style={{margin:0,fontSize:"10px",color:"rgba(255,255,255,0.6)"}}>{sub}</p>
    </div>
  );
}

function ExpRow({e,fmt,onDel}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
          {e.storeIcon&&<span style={{fontSize:"13px"}}>{e.storeIcon}</span>}
          <p style={{margin:0,fontSize:"13px",color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.description||e.category}</p>
        </div>
        <p style={{margin:"1px 0 0",fontSize:"10px",color:C.muted}}>{e.category} · {new Date(e.date+"T12:00:00").toLocaleDateString("pt-BR")}</p>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:"8px",flexShrink:0,marginLeft:"10px"}}>
        <p style={{margin:0,fontWeight:"700",color:"#ef4444",fontSize:"13px"}}>{fmt(e.value)}</p>
        {onDel&&<button onClick={()=>onDel(e.id)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:"12px",padding:"2px"}}>🗑️</button>}
      </div>
    </div>
  );
}

export default function App(){
  const [tab,setTab]=useState("dashboard");
  const [expenses,setExpenses]=useState([]);
  const [budget,setBudget]=useState(2000);
  const [budgetInput,setBudgetInput]=useState("2000");
  const [form,setForm]=useState({value:"",description:"",category:"Alimentação",payment:"Pix",priority:"Essencial",date:today()});
  const [scanning,setScanning]=useState(false);
  const [scanMsg,setScanMsg]=useState("");
  const [previewUrl,setPreviewUrl]=useState(null);
  const [syncing,setSyncing]=useState(false);
  const [syncLog,setSyncLog]=useState([]);
  const [syncResult,setSyncResult]=useState(null);
  const [activeStores,setActiveStores]=useState({amazon:true,walmart:true,temu:true,shein:true,homedepot:true});
  const [bills,setBills]=useState(DEFAULT_BILLS);
  const [paidMonths,setPaidMonths]=useState({});
  const [editBill,setEditBill]=useState(null);
  const fileRef=useRef();
  const camRef=useRef();

  useEffect(()=>{
    (async()=>{
      try{const r=await window.storage.get("exp-v4");if(r)setExpenses(JSON.parse(r.value));}catch{}
      try{const b=await window.storage.get("budget-v4");if(b){setBudget(Number(b.value));setBudgetInput(b.value);}}catch{}
      try{const bl=await window.storage.get("bills-v4");if(bl)setBills(JSON.parse(bl.value));}catch{}
      try{const pm=await window.storage.get("paidMonths-v4");if(pm)setPaidMonths(JSON.parse(pm.value));}catch{}
    })();
  },[]);

  const saveExp  = async d=>{try{await window.storage.set("exp-v4",JSON.stringify(d));}catch{}};
  const saveBills= async d=>{try{await window.storage.set("bills-v4",JSON.stringify(d));}catch{}};
  const savePaid = async d=>{try{await window.storage.set("paidMonths-v4",JSON.stringify(d));}catch{}};

  const addExpense=(extra={})=>{
    if(!form.value||isNaN(form.value))return;
    const updated=[{...form,...extra,value:parseFloat(form.value),id:Date.now()},...expenses];
    setExpenses(updated);saveExp(updated);
    setForm(f=>({...f,value:"",description:""}));setPreviewUrl(null);setScanMsg("");
    setTab("dashboard");
  };
  const delExpense=id=>{const u=expenses.filter(e=>e.id!==id);setExpenses(u);saveExp(u);};
  const saveBudget=async()=>{const v=parseFloat(budgetInput);if(!isNaN(v)){setBudget(v);try{await window.storage.set("budget-v4",String(v));}catch{}}};

  const markPaid=(bill)=>{
    const mk=monthKey();const key=`${bill.id}-${mk}`;
    if(paidMonths[key])return;
    const newPaid={...paidMonths,[key]:true};setPaidMonths(newPaid);savePaid(newPaid);
    if(!bill.value||isNaN(bill.value))return;
    const exp={id:Date.now(),value:parseFloat(bill.value),description:bill.name,category:"Contas de Casa",payment:bill.payment,priority:"Essencial",date:today(),source:"bill",storeIcon:bill.icon};
    const updated=[exp,...expenses];setExpenses(updated);saveExp(updated);
  };
  const unmarkPaid=(bill)=>{
    const key=`${bill.id}-${monthKey()}`;
    const newPaid={...paidMonths};delete newPaid[key];setPaidMonths(newPaid);savePaid(newPaid);
    const updated=expenses.filter(e=>!(e.source==="bill"&&e.description===bill.name&&e.date===today()));
    setExpenses(updated);saveExp(updated);
  };
  const updateBill=(id,field,val)=>{const u=bills.map(b=>b.id===id?{...b,[field]:val}:b);setBills(u);saveBills(u);};

  const scanReceipt=async(file)=>{
    setScanning(true);setScanMsg("🔍 Analisando com IA...");setPreviewUrl(URL.createObjectURL(file));
    try{
      const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(file);});
      const resp=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:600,
          messages:[{role:"user",content:[
            {type:"image",source:{type:"base64",media_type:file.type,data:b64}},
            {type:"text",text:`Analise esta nota e extraia os dados. Responda APENAS JSON sem markdown:\n{"value":<número>,"description":"<loja>","category":"<uma de: ${CATEGORIES.join("|")}>","date":"<YYYY-MM-DD ou ${today()}>","payment":"<Pix|Débito|Crédito|Dinheiro|Boleto|Débito Automático>"}`}
          ]}]})
      });
      const d=await resp.json();
      const txt=d.content.map(i=>i.text||"").join("").replace(/```json|```/g,"").trim();
      const p=JSON.parse(txt);
      setForm(f=>({...f,value:String(p.value||""),description:p.description||"",category:CATEGORIES.includes(p.category)?p.category:"Outros",date:p.date||today(),payment:PAYMENTS.includes(p.payment)?p.payment:"Boleto"}));
      setScanMsg("✅ Pronto! Confira os dados.");
    }catch{setScanMsg("❌ Não leu. Preencha manualmente.");}
    setScanning(false);
  };

  const syncGmail=async()=>{
    setSyncing(true);setSyncResult(null);setSyncLog([]);
    const stores=Object.entries(activeStores).filter(([,v])=>v).map(([k])=>STORES[k].label);
    if(!stores.length){setSyncing(false);return;}
    const addLog=m=>setSyncLog(l=>[...l,m]);
    addLog("🔍 Conectando ao Gmail...");
    try{
      const resp=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:2000,
          mcp_servers:[{type:"url",url:"https://gmailmcp.googleapis.com/mcp/v1",name:"gmail"}],
          messages:[{role:"user",content:`Use Gmail para buscar e-mails de confirmação de pedidos das lojas: ${stores.join(", ")}. Últimos 90 dias. Retorne APENAS array JSON:\n[{"store":"Amazon","value":49.99,"description":"Pedido #123","date":"2026-05-15","payment":"Crédito"}]\nSe nenhum, retorne [].`}]})
      });
      const data=await resp.json();
      const allText=data.content.filter(i=>i.type==="text").map(i=>i.text).join("\n");
      const jm=allText.match(/\[[\s\S]*\]/);
      if(!jm)throw new Error();
      const orders=JSON.parse(jm[0]);
      if(!orders.length){addLog("📭 Nenhum pedido encontrado.");setSyncResult({added:0,skipped:0});setSyncing(false);return;}
      let added=0,skipped=0;const newExp=[];
      for(const o of orders){
        const sk=Object.keys(STORES).find(k=>STORES[k].label.toLowerCase()===o.store?.toLowerCase());
        const si=sk?STORES[sk]:{label:o.store,icon:"🛍️",cat:"Compras Online"};
        if(expenses.some(e=>e.description===o.description&&e.date===o.date)){skipped++;continue;}
        newExp.push({id:Date.now()+Math.random(),value:parseFloat(o.value)||0,description:o.description||si.label,category:si.cat,payment:PAYMENTS.includes(o.payment)?o.payment:"Crédito",priority:"Essencial",date:o.date||today(),source:"gmail",storeIcon:si.icon});
        added++;addLog(`${si.icon} ${si.label}: ${fmt(o.value||0)}`);
      }
      const updated=[...newExp,...expenses];setExpenses(updated);saveExp(updated);
      setSyncResult({added,skipped});
      addLog(`✅ ${added} importados · ${skipped} ignorados`);
    }catch{addLog("❌ Erro ao acessar o Gmail.");}
    setSyncing(false);
  };

  const now=new Date();
  const cm=now.getMonth(),cy=now.getFullYear(),mk=monthKey();
  const mExp=expenses.filter(e=>{const d=new Date(e.date+"T12:00:00");return d.getMonth()===cm&&d.getFullYear()===cy;});
  const tExp=expenses.filter(e=>e.date===today());
  const mTotal=mExp.reduce((s,e)=>s+e.value,0);
  const tTotal=tExp.reduce((s,e)=>s+e.value,0);
  const bPct=Math.min((mTotal/budget)*100,100);
  const catData=CATEGORIES.map(c=>({name:c,value:mExp.filter(e=>e.category===c).reduce((s,e)=>s+e.value,0)})).filter(d=>d.value>0);
  const last7=Array.from({length:7},(_,i)=>{
    const d=new Date();d.setDate(d.getDate()-(6-i));
    const ds=d.toISOString().split("T")[0];
    return{day:d.toLocaleDateString("pt-BR",{weekday:"short"}),total:expenses.filter(e=>e.date===ds).reduce((s,e)=>s+e.value,0)};
  });
  const activeBills=bills.filter(b=>b.active);
  const billsTotal=activeBills.reduce((s,b)=>s+(parseFloat(b.value)||0),0);
  const billsPaid=activeBills.filter(b=>paidMonths[`${b.id}-${mk}`]).length;

  const tabs=[["dashboard","🏠","Início"],["bills","💡","Contas"],["add","➕","Adicionar"],["history","📋","Histórico"],["charts","📈","Gráficos"]];

  return(
    <div style={{fontFamily:"system-ui,sans-serif",background:C.bg,color:C.text,maxWidth:"480px",margin:"0 auto",paddingBottom:"60px"}}>
      <div style={{background:"#7c3aed",padding:"10px 16px",position:"sticky",top:0,zIndex:10,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:"16px",fontWeight:"700",color:"#fff"}}>💸 Gastos</span>
        <span style={{fontSize:"11px",color:"rgba(255,255,255,0.7)"}}>{now.toLocaleDateString("pt-BR",{day:"numeric",month:"short"})}</span>
      </div>

      <div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:"10px"}}>

      {tab==="dashboard"&&<>
        <div style={{display:"flex",gap:"8px"}}>
          <MiniCard title="Este Mês" value={fmt(mTotal)} sub={`${mExp.length} gastos`} gradient="linear-gradient(135deg,#7c3aed,#a855f7)"/>
          <MiniCard title="Hoje" value={fmt(tTotal)} sub={`${tExp.length} gastos`} gradient="linear-gradient(135deg,#059669,#10b981)"/>
        </div>

        <div style={{background:C.card,borderRadius:"12px",padding:"12px",boxShadow:"0 1px 3px rgba(0,0,0,0.08)"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
            <span style={{fontSize:"12px",color:C.sub,fontWeight:"600"}}>Orçamento Mensal</span>
            <span style={{fontSize:"12px",fontWeight:"700",color:bPct>80?"#ef4444":bPct>50?"#f97316":"#22c55e"}}>{bPct.toFixed(0)}%</span>
          </div>
          <div style={{background:"#e2e8f0",borderRadius:"4px",height:"7px",marginBottom:"8px"}}>
            <div style={{width:`${bPct}%`,height:"100%",borderRadius:"4px",background:bPct>80?"#ef4444":bPct>50?"#f97316":"#22c55e",transition:"width .4s"}}/>
          </div>
          <div style={{display:"flex",gap:"6px"}}>
            <input value={budgetInput} onChange={e=>setBudgetInput(e.target.value)} style={{...iStyle,flex:1,padding:"5px 8px",fontSize:"12px"}} type="number"/>
            <button onClick={saveBudget} style={{background:"#7c3aed",color:"#fff",border:"none",borderRadius:"7px",padding:"5px 14px",cursor:"pointer",fontSize:"12px"}}>Salvar</button>
          </div>
          <p style={{margin:"4px 0 0",fontSize:"10px",color:C.muted,textAlign:"right"}}>{fmt(mTotal)} de {fmt(budget)}</p>
        </div>

        <div onClick={()=>setTab("bills")} style={{background:C.card,borderRadius:"12px",padding:"12px",cursor:"pointer",boxShadow:"0 1px 3px rgba(0,0,0,0.08)",borderLeft:"4px solid #38bdf8"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
            <div>
              <p style={{margin:0,fontWeight:"700",fontSize:"13px",color:"#0284c7"}}>💡 Contas de Casa</p>
              <p style={{margin:0,fontSize:"10px",color:C.muted}}>{billsPaid}/{activeBills.length} pagas · {fmt(billsTotal)}/mês</p>
            </div>
            <span style={{color:"#0284c7",fontSize:"16px"}}>›</span>
          </div>
          <div style={{display:"flex",gap:"6px"}}>
            {activeBills.map(b=>{
              const paid=!!paidMonths[`${b.id}-${mk}`];
              return(
                <div key={b.id} style={{flex:1,background:paid?"#dcfce7":"#f1f5f9",border:`1px solid ${paid?"#86efac":"#e2e8f0"}`,borderRadius:"8px",padding:"5px 4px",textAlign:"center"}}>
                  <p style={{margin:0,fontSize:"17px",lineHeight:1}}>{b.icon}</p>
                  {paid&&<p style={{margin:"1px 0 0",fontSize:"9px",color:"#16a34a",fontWeight:"700"}}>✓</p>}
                </div
