import { useState, useEffect, useRef } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const CATEGORIES = ["Alimentação","Transporte","Saúde","Moradia","Lazer","Roupas","Eletrônicos","Casa","Compras Online","Educação","Contas de Casa","Outros"];
const PAYMENTS = ["Pix","Débito","Crédito","Dinheiro","Boleto","Débito Automático"];
const PRIORITIES = ["Essencial","Importante","Lazer"];
const CAT_COLORS = {"Alimentação":"#f97316","Transporte":"#3b82f6","Saúde":"#22c55e","Moradia":"#a855f7","Lazer":"#ec4899","Roupas":"#f43f5e","Eletrônicos":"#06b6d4","Casa":"#84cc16","Compras Online":"#eab308","Educação":"#8b5cf6","Contas de Casa":"#38bdf8","Outros":"#6b7280"};
const PRI_COLORS = {"Essencial":"#ef4444","Importante":"#f97316","Lazer":"#22c55e"};
const STORES = {amazon:{label:"Amazon",icon:"📦",cat:"Compras Online"},walmart:{label:"Walmart",icon:"🛒",cat:"Compras Online"},temu:{label:"Temu",icon:"🎁",cat:"Compras Online"},shein:{label:"Shein",icon:"👗",cat:"Roupas"},homedepot:{label:"Home Depot",icon:"🔨",cat:"Casa"}};
const DEFAULT_BILLS = [
  {id:"internet",name:"Internet",icon:"📶",color:"#38bdf8",value:"",dueDay:"10",payment:"Débito Automático",active:true},
  {id:"luz",name:"Luz",icon:"💡",color:"#facc15",value:"",dueDay:"15",payment:"Boleto",active:true},
  {id:"agua",name:"Água",icon:"💧",color:"#60a5fa",value:"",dueDay:"20",payment:"Boleto",active:true},
  {id:"lixo",name:"Lixo",icon:"🗑️",color:"#4ade80",value:"",dueDay:"25",payment:"Boleto",active:true},
  {id:"tv",name:"TV Assinatura",icon:"📺",color:"#c084fc",value:"",dueDay:"5",payment:"Débito Automático",active:true},
];

const fmt = v => v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const today = () => new Date().toISOString().split("T")[0];
const monthKey = () => { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; };
const iStyle = {width:"100%",padding:"8px 10px",borderRadius:"8px",border:"1px solid #2d2d44",background:"#0f0f1a",color:"#e2e8f0",fontSize:"13px",boxSizing:"border-box"};

function Field({label,children}){return <div><label style={{display:"block",marginBottom:"3px",fontSize:"12px",color:"#94a3b8"}}>{label}</label>{children}</div>;}

function MiniCard({title,value,sub,color,gradient}){
  return(
    <div style={{background:gradient||"#1e1e2e",borderRadius:"10px",padding:"12px",flex:1}}>
      <p style={{margin:"0 0 2px",color:"rgba(255,255,255,0.6)",fontSize:"11px"}}>{title}</p>
      <p style={{margin:"0 0 1px",fontSize:"18px",fontWeight:"bold",color:color||"#fff"}}>{value}</p>
      <p style={{margin:0,fontSize:"10px",color:"rgba(255,255,255,0.4)"}}>{sub}</p>
    </div>
  );
}

function ExpRow({e,fmt,onDel}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #1e1e2e"}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
          {e.storeIcon&&<span style={{fontSize:"13px"}}>{e.storeIcon}</span>}
          <p style={{margin:0,fontSize:"13px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.description||e.category}</p>
        </div>
        <p style={{margin:"1px 0 0",fontSize:"10px",color:"#64748b"}}>{e.category} · {new Date(e.date+"T12:00:00").toLocaleDateString("pt-BR")}</p>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:"8px",flexShrink:0,marginLeft:"10px"}}>
        <p style={{margin:0,fontWeight:"bold",color:"#f87171",fontSize:"13px"}}>{fmt(e.value)}</p>
        {onDel&&<button onClick={()=>onDel(e.id)} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:"12px",padding:"2px"}}>🗑️</button>}
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
    const mk=monthKey();
    const key=`${bill.id}-${mk}`;
    if(paidMonths[key])return;
    const newPaid={...paidMonths,[key]:true};
    setPaidMonths(newPaid);savePaid(newPaid);
    if(!bill.value||isNaN(bill.value))return;
    const exp={id:Date.now(),value:parseFloat(bill.value),description:`${bill.name}`,category:"Contas de Casa",payment:bill.payment,priority:"Essencial",date:today(),source:"bill",storeIcon:bill.icon};
    const updated=[exp,...expenses];setExpenses(updated);saveExp(updated);
  };
  const unmarkPaid=(bill)=>{
    const key=`${bill.id}-${monthKey()}`;
    const newPaid={...paidMonths};delete newPaid[key];
    setPaidMonths(newPaid);savePaid(newPaid);
    const updated=expenses.filter(e=>!(e.source==="bill"&&e.description===bill.name&&e.date===today()));
    setExpenses(updated);saveExp(updated);
  };
  const updateBill=(id,field,val)=>{const updated=bills.map(b=>b.id===id?{...b,[field]:val}:b);setBills(updated);saveBills(updated);};

  const scanReceipt=async(file)=>{
    setScanning(true);setScanMsg("🔍 Analisando com IA...");
    setPreviewUrl(URL.createObjectURL(file));
    try{
      const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(file);});
      const resp=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:600,
          messages:[{role:"user",content:[
            {type:"image",source:{type:"base64",media_type:file.type,data:b64}},
            {type:"text",text:`Analise esta nota e extraia os dados. Responda APENAS JSON sem markdown:\n{"value":<número>,"description":"<loja>","category":"<Alimentação|Transporte|Saúde|Moradia|Lazer|Roupas|Eletrônicos|Casa|Compras Online|Educação|Contas de Casa|Outros>","date":"<YYYY-MM-DD ou ${today()}>","payment":"<Pix|Débito|Crédito|Dinheiro|Boleto|Débito Automático>"}`}
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
      addLog(`📬 Buscando e-mails de: ${stores.join(", ")}...`);
      const resp=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:2000,
          mcp_servers:[{type:"url",url:"https://gmailmcp.googleapis.com/mcp/v1",name:"gmail"}],
          messages:[{role:"user",content:`Use Gmail para buscar e-mails de confirmação de pedidos das lojas: ${stores.join(", ")}. Últimos 90 dias. Retorne APENAS array JSON sem markdown:\n[{"store":"Amazon","value":49.99,"description":"Pedido #123","date":"2026-05-15","payment":"Crédito"}]\nSe nenhum encontrado, retorne [].`}]})
      });
      const data=await resp.json();
      addLog("📨 Analisando e-mails...");
      const allText=data.content.filter(i=>i.type==="text").map(i=>i.text).join("\n");
      const jm=allText.match(/\[[\s\S]*\]/);
      if(!jm)throw new Error("no data");
      const orders=JSON.parse(jm[0]);
      if(!orders.length){addLog("📭 Nenhum pedido encontrado.");setSyncResult({added:0,skipped:0});setSyncing(false);return;}
      addLog(`✅ ${orders.length} pedido(s) encontrado(s)!`);
      let added=0,skipped=0;
      const newExp=[];
      for(const o of orders){
        const sk=Object.keys(STORES).find(k=>STORES[k].label.toLowerCase()===o.store?.toLowerCase());
        const si=sk?STORES[sk]:{label:o.store,icon:"🛍️",cat:"Compras Online"};
        if(expenses.some(e=>e.description===o.description&&e.date===o.date)){skipped++;continue;}
        newExp.push({id:Date.now()+Math.random(),value:parseFloat(o.value)||0,description:o.description||si.label,category:si.cat,payment:PAYMENTS.includes(o.payment)?o.payment:"Crédito",priority:"Essencial",date:o.date||today(),source:"gmail",storeIcon:si.icon,store:si.label});
        added++;addLog(`${si.icon} ${si.label}: ${fmt(o.value||0)}`);
      }
      const updated=[...newExp,...expenses];setExpenses(updated);saveExp(updated);
      setSyncResult({added,skipped});
    }catch{addLog("❌ Erro ao acessar o Gmail.");}
    setSyncing(false);
  };

  const now=new Date();
  const cm=now.getMonth(),cy=now.getFullYear();
  const mk=monthKey();
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
    <div style={{fontFamily:"system-ui,sans-serif",background:"#0f0f1a",color:"#e2e8f0",minHeight:"100vh",maxWidth:"480px",margin:"0 auto",paddingBottom:"64px"}}>
      {/* Header */}
      <div style={{background:"#1a1a2e",padding:"10px 16px",borderBottom:"1px solid #2d2d44",position:"sticky",top:0,zIndex:10,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:"16px",fontWeight:"700",color:"#a78bfa"}}>💸 Gastos</span>
        <span style={{fontSize:"11px",color:"#475569"}}>{now.toLocaleDateString("pt-BR",{day:"numeric",month:"short"})}</span>
      </div>

      <div style={{padding:"10px 12px"}}>

      {/* DASHBOARD */}
      {tab==="dashboard"&&(
        <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
          <div style={{display:"flex",gap:"8px"}}>
            <MiniCard title="Este Mês" value={fmt(mTotal)} sub={`${mExp.length} gastos`} gradient="linear-gradient(135deg,#7c3aed,#a855f7)"/>
            <MiniCard title="Hoje" value={fmt(tTotal)} sub={`${tExp.length} gastos`} gradient="linear-gradient(135deg,#059669,#10b981)"/>
          </div>

          <div style={{background:"#1e1e2e",borderRadius:"10px",padding:"10px 12px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
              <span style={{fontSize:"12px",color:"#94a3b8"}}>Orçamento Mensal</span>
              <span style={{fontSize:"12px",fontWeight:"700",color:bPct>80?"#ef4444":bPct>50?"#f97316":"#22c55e"}}>{bPct.toFixed(0)}%</span>
            </div>
            <div style={{background:"#2d2d44",borderRadius:"4px",height:"6px",marginBottom:"6px"}}>
              <div style={{width:`${bPct}%`,height:"100%",borderRadius:"4px",background:bPct>80?"#ef4444":bPct>50?"#f97316":"#22c55e",transition:"width .4s"}}/>
            </div>
            <div style={{display:"flex",gap:"6px"}}>
              <input value={budgetInput} onChange={e=>setBudgetInput(e.target.value)} style={{...iStyle,flex:1,padding:"5px 8px",fontSize:"12px"}} type="number" placeholder="Orçamento"/>
              <button onClick={saveBudget} style={{background:"#7c3aed",color:"#fff",border:"none",borderRadius:"7px",padding:"5px 12px",cursor:"pointer",fontSize:"12px",whiteSpace:"nowrap"}}>Salvar</button>
            </div>
            <p style={{margin:"4px 0 0",fontSize:"10px",color:"#475569",textAlign:"right"}}>{fmt(mTotal)} de {fmt(budget)}</p>
          </div>

          <div onClick={()=>setTab("bills")} style={{background:"#0c2233",border:"1px solid #1e3a5f",borderRadius:"10px",padding:"10px 12px",cursor:"pointer"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
              <div>
                <p style={{margin:0,fontWeight:"600",fontSize:"13px",color:"#38bdf8"}}>💡 Contas de Casa</p>
                <p style={{margin:0,fontSize:"10px",color:"#64748b"}}>{billsPaid}/{activeBills.length} pagas · {fmt(billsTotal)}/mês</p>
              </div>
              <span style={{color:"#38bdf8",fontSize:"12px"}}>›</span>
            </div>
            <div style={{display:"flex",gap:"6px"}}>
              {activeBills.map(b=>{
                const paid=!!paidMonths[`${b.id}-${mk}`];
                return(
                  <div key={b.id} style={{flex:1,background:paid?"#166534":"#2d2d44",borderRadius:"8px",padding:"6px 4px",textAlign:"center"}}>
                    <p style={{margin:0,fontSize:"18px",lineHeight:1}}>{b.icon}</p>
                    {paid&&<p style={{margin:"2px 0 0",fontSize:"9px",color:"#4ade80"}}>✓</p>}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{display:"flex",gap:"8px"}}>
            <button onClick={()=>setTab("add")} style={{flex:1,background:"#1a0a2e",border:"1px solid #7c3aed",borderRadius:"10px",padding:"10px",cursor:"pointer",color:"#a78bfa",fontSize:"13px",fontWeight:"600"}}>➕ Adicionar Gasto</button>
            <button onClick={()=>setTab("charts")} style={{flex:1,background:"#0a1a0f",border:"1px solid #166534",borderRadius:"10px",padding:"10px",cursor:"pointer",color:"#4ade80",fontSize:"13px",fontWeight:"600"}}>📧 Gmail Sync</button>
          </div>

          <div style={{background:"#1e1e2e",borderRadius:"10px",padding:"10px 12px"}}>
            <p style={{margin:"0 0 6px",fontSize:"12px",color:"#94a3b8",fontWeight:"600"}}>Últimas transações</p>
            {expenses.slice(0,5).map(e=><ExpRow key={e.id} e={e} fmt={fmt}/>)}
            {expenses.length===0&&<p style={{color:"#475569",fontSize:"12px",textAlign:"center",padding:"12px 0"}}>Nenhum gasto registrado 💤</p>}
            {expenses.length>5&&<p onClick={()=>setTab("history")} style={{color:"#7c3aed",fontSize:"12px",textAlign:"center",margin:"6px 0 0",cursor:"pointer"}}>Ver todos →</p>}
          </div>
        </div>
      )}

      {/* CONTAS */}
      {tab==="bills"&&(
        <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
          <div style={{background:"#0c2233",border:"1px solid #1e3a5f",borderRadius:"10px",padding:"10px 12px",display:"flex",gap:"8px",justifyContent:"space-around",textAlign:"center"}}>
            <div><p style={{margin:0,fontSize:"16px",fontWeight:"bold",color:"#38bdf8"}}>{fmt(billsTotal)}</p><p style={{margin:0,fontSize:"10px",color:"#64748b"}}>Total mensal</p></div>
            <div style={{width:"1px",background:"#1e3a5f"}}/>
            <div><p style={{margin:0,fontSize:"16px",fontWeight:"bold",color:"#4ade80"}}>{billsPaid}</p><p style={{margin:0,fontSize:"10px",color:"#64748b"}}>Pagas</p></div>
            <div style={{width:"1px",background:"#1e3a5f"}}/>
            <div><p style={{margin:0,fontSize:"16px",fontWeight:"bold",color:"#f87171"}}>{activeBills.length-billsPaid}</p><p style={{margin:0,fontSize:"10px",color:"#64748b"}}>Pendentes</p></div>
          </div>

          {bills.map(bill=>{
            const paid=!!paidMonths[`${bill.id}-${mk}`];
            const isEditing=editBill===bill.id;
            const dueDay=parseInt(bill.dueDay)||1;
            const dueDate=new Date(now.getFullYear(),now.getMonth(),dueDay);
            const dueDateStr=`dia ${dueDay}`;
            const overdue=!paid&&dueDate<now&&dueDate.getDate()!==now.getDate();
            const daysLeft=!paid?Math.ceil((dueDate<now?new Date(now.getFullYear(),now.getMonth()+1,dueDay):dueDate-now)/(1000*60*60*24)):null;
            return(
              <div key={bill.id} style={{background:"#1e1e2e",borderRadius:"10px",overflow:"hidden",border:paid?"1px solid #166534":overdue?"1px solid #7f1d1d":"1px solid #2d2d44"}}>
                <div style={{padding:"10px 12px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                    <div style={{width:"38px",height:"38px",borderRadius:"10px",background:bill.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px",flexShrink:0}}>{bill.icon}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                        <p style={{margin:0,fontWeight:"600",fontSize:"13px"}}>{bill.name}</p>
                        {paid
                          ?<span style={{fontSize:"10px",color:"#4ade80",background:"#16683422",padding:"1px 6px",borderRadius:"8px"}}>✓ Paga</span>
                          :overdue
                            ?<span style={{fontSize:"10px",color:"#ef4444",background:"#ef444422",padding:"1px 6px",borderRadius:"8px"}}>⚠ Vencida</span>
                            :<span style={{fontSize:"10px",color:daysLeft<=3?"#ef4444":daysLeft<=7?"#f97316":"#4ade80",background:"#2d2d44",padding:"1px 6px",borderRadius:"8px"}}>{daysLeft===0?"Hoje":daysLeft===1?"Amanhã":`${daysLeft}d`}</span>
                        }
                      </div>
                      <p style={{margin:"2px 0 0",fontSize:"11px",color:"#64748b"}}>{dueDateStr} · {bill.payment}</p>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:"6px",flexShrink:0}}>
                      <p style={{margin:0,fontWeight:"bold",fontSize:"14px",color:bill.color}}>{bill.value?fmt(parseFloat(bill.value)):"—"}</p>
                      <button onClick={()=>setEditBill(isEditing?null:bill.id)} style={{background:"#2d2d44",color:"#94a3b8",border:"none",borderRadius:"6px",padding:"4px 7px",cursor:"pointer",fontSize:"12px"}}>{isEditing?"✕":"✏️"}</button>
                    </div>
                  </div>
                  <div style={{marginTop:"8px"}}>
                    {!paid
                      ?<button onClick={()=>markPaid(bill)} disabled={!bill.value} style={{width:"100%",background:bill.value?"#166534":"#2d2d44",color:bill.value?"#4ade80":"#64748b",border:"none",borderRadius:"7px",padding:"7px",cursor:bill.value?"pointer":"not-allowed",fontSize:"13px",fontWeight:"600"}}>{bill.value?"✓ Marcar como paga":"Configure o valor ✏️"}</button>
                      :<button onClick={()=>unmarkPaid(bill)} style={{width:"100%",background:"#2d2d44",color:"#94a3b8",border:"none",borderRadius:"7px",padding:"7px",cursor:"pointer",fontSize:"12px"}}>↩ Desmarcar pagamento</button>
                    }
                  </div>
                </div>
                {isEditing&&(
                  <div style={{background:"#0f0f1a",padding:"10px 12px",borderTop:"1px solid #2d2d44",display:"flex",flexDirection:"column",gap:"8px"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                      <Field label="Valor (R$)"><input type="number" placeholder="Ex: 99.90" value={bill.value} onChange={e=>updateBill(bill.id,"value",e.target.value)} style={iStyle}/></Field>
                      <Field label="Dia vencimento"><input type="number" min="1" max="31" value={bill.dueDay} onChange={e=>updateBill(bill.id,"dueDay",e.target.value)} style={iStyle}/></Field>
                    </div>
                    <Field label="Pagamento"><select value={bill.payment} onChange={e=>updateBill(bill.id,"payment",e.target.value)} style={iStyle}>{PAYMENTS.map(p=><option key={p}>{p}</option>)}</select></Field>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <span style={{fontSize:"12px",color:"#94a3b8"}}>Conta ativa</span>
                      <div onClick={()=>updateBill(bill.id,"active",!bill.active)} style={{width:"36px",height:"20px",borderRadius:"10px",background:bill.active?"#7c3aed":"#2d2d44",cursor:"pointer",position:"relative",transition:"background .2s"}}>
                        <div style={{position:"absolute",top:"3px",left:bill.active?"19px":"3px",width:"14px",height:"14px",borderRadius:"50%",background:"#fff",transition:"left .2s"}}/>
                      </div>
                    </div>
                    <button onClick={()=>setEditBill(null)} style={{background:"#7c3aed",color:"#fff",border:"none",borderRadius:"7px",padding:"8px",cursor:"pointer",fontSize:"13px",fontWeight:"bold"}}>✓ Salvar</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ADD */}
      {tab==="add"&&(
        <div style={{background:"#1e1e2e",borderRadius:"10px",padding:"12px",display:"flex",flexDirection:"column",gap:"10px"}}>
          <div style={{background:"#0f0f1a",borderRadius:"8px",padding:"10px",textAlign:"center"}}>
            <p style={{margin:"0 0 8px",color:"#a78bfa",fontWeight:"600",fontSize:"13px"}}>📷 Escanear Nota</p>
            <input ref={camRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>e.target.files[0]&&scanReceipt(e.target.files[0])}/>
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>e.target.files[0]&&scanReceipt(e.target.files[0])}/>
            <div style={{display:"flex",gap:"8px",justifyContent:"center"}}>
              <button onClick={()=>camRef.current.click()} disabled={scanning} style={{background:"#7c3aed",color:"#fff",border:"none",borderRadius:"8px",padding:"8px 14px",cursor:"pointer",fontSize:"12px"}}>📷 Câmera</button>
              <button onClick={()=>fileRef.current.click()} disabled={scanning} style={{background:"#1e1e2e",color:"#a78bfa",border:"1px solid #7c3aed",borderRadius:"8px",padding:"8px 14px",cursor:"pointer",fontSize:"12px"}}>🖼️ Galeria</button>
            </div>
            {previewUrl&&<img src={previewUrl} alt="nota" style={{maxWidth:"100%",maxHeight:"100px",objectFit:"contain",borderRadius:"6px",marginTop:"8px",border:"1px solid #2d2d44"}}/>}
            {scanMsg&&<p style={{margin:"6px 0 0",fontSize:"12px",color:scanMsg.startsWith("✅")?"#22c55e":scanMsg.startsWith("❌")?"#ef4444":"#a78bfa"}}>{scanMsg}</p>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
            <div style={{flex:1,height:"1px",background:"#2d2d44"}}/><span style={{color:"#475569",fontSize:"11px"}}>ou manual</span><div style={{flex:1,height:"1px",background:"#2d2d44"}}/>
          </div>
          <Field label="Valor (R$)"><input type="number" placeholder="0,00" value={form.value} onChange={e=>setForm({...form,value:e.target.value})} style={iStyle}/></Field>
          <Field label="Descrição"><input type="text" placeholder="Ex: Mercado, Netflix..." value={form.description} onChange={e=>setForm({...form,description:e.target.value})} style={iStyle}/></Field>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
            <Field label="Categoria"><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={iStyle}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></Field>
            <Field label="Pagamento"><select value={form.payment} onChange={e=>setForm({...form,payment:e.target.value})} style={iStyle}>{PAYMENTS.map(p=><option key={p}>{p}</option>)}</select></Field>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
            <Field label="Prioridade"><select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})} style={iStyle}>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select></Field>
            <Field label="Data"><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={iStyle}/></Field>
          </div>
          <button onClick={()=>addExpense()} style={{background:form.value?"#7c3aed":"#3d2d6e",color:"#fff",border:"none",borderRadius:"9px",padding:"11px",cursor:"pointer",fontSize:"14px",fontWeight:"bold"}}>+ Adicionar Gasto</button>
        </div>
      )}

      {/* HISTÓRICO */}
      {tab==="history"&&(
        <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
          <p style={{color:"#64748b",fontSize:"11px",margin:"0 0 6px"}}>{expenses.length} transação{expenses.length!==1?"s":""} registrada{expenses.length!==1?"s":""}</p>
          {expenses.length===0&&<p style={{color:"#475569",textAlign:"center",padding:"30px 0",fontSize:"13px"}}>Nenhum gasto registrado ainda 💤</p>}
          {expenses.map(e=>(
            <div key={e.id} style={{background:"#1e1e2e",borderRadius:"8px",padding:"2px 10px"}}>
              <ExpRow e={e} fmt={fmt} onDel={delExpense}/>
            </div>
          ))}
        </div>
      )}

      {/* GRÁFICOS */}
      {tab==="charts"&&(
        <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
          <div style={{background:"#1e1e2e",borderRadius:"10px",padding:"10px 12px"}}>
            <p style={{margin:"0 0 8px",color:"#94a3b8",fontSize:"12px",fontWeight:"600"}}>Por Categoria — Mês Atual</p>
            {catData.length>0?(
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={catData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({percent})=>`${(percent*100).toFixed(0)}%`} labelLine={false}>
                      {catData.map(d=><Cell key={d.name} fill={CAT_COLORS[d.name]||"#6b7280"}/>)}
                    </Pie>
                    <Tooltip formatter={v=>fmt(v)} contentStyle={{background:"#1e1e2e",border:"1px solid #2d2d44",color:"#e2e8f0",fontSize:"12px"}}/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{display:"flex",flexWrap:"wrap",gap:"6px",marginTop:"6px"}}>
                  {catData.map(d=>(
                    <div key={d.name} style={{display:"flex",alignItems:"center",gap:"4px"}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:CAT_COLORS[d.name],flexShrink:0}}/>
                      <span style={{fontSize:"11px",color:"#94a3b8"}}>{d.name}: {fmt(d.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ):<p style={{color:"#475569",textAlign:"center",padding:"20px 0",fontSize:"12px"}}>Sem dados este mês</p>}
          </div>
          <div style={{background:"#1e1e2e",borderRadius:"10px",padding:"10px 12px"}}>
            <p style={{margin:"0 0 8px",color:"#94a3b8",fontSize:"12px",fontWeight:"600"}}>Últimos 7 Dias</p>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={last7} margin={{top:0,right:0,left:-22,bottom:0}}>
                <XAxis dataKey="day" tick={{fill:"#64748b",fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:"#64748b",fontSize:9}} axisLine={false} tickLine={false}/>
                <Tooltip formatter={v=>fmt(v)} contentStyle={{background:"#1e1e2e",border:"1px solid #2d2d44",color:"#e2e8f0",fontSize:"12px"}}/>
                <Bar dataKey="total" fill="#7c3aed" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{background:"#0a1a0f",border:"1px solid #166534",borderRadius:"10px",padding:"10px 12px"}}>
            <p style={{margin:"0 0 6px",fontSize:"12px",color:"#4ade80",fontWeight:"600"}}>📧 Sincronizar Gmail</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:"6px",marginBottom:"8px"}}>
              {Object.entries(STORES).map(([key,s])=>(
                <div key={key} onClick={()=>setActiveStores(a=>({...a,[key]:!a[key]}))} style={{display:"flex",alignItems:"center",gap:"4px",background:activeStores[key]?"#166534":"#2d2d44",borderRadius:"20px",padding:"4px 10px",cursor:"pointer"}}>
                  <span style={{fontSize:"13px"}}>{s.icon}</span>
                  <span style={{fontSize:"11px",color:activeStores[key]?"#4ade80":"#94a3b8"}}>{s.label}</span>
                </div>
              ))}
            </div>
            <button onClick={syncGmail} disabled={syncing} style={{width:"100%",background:syncing?"#1a3a2a":"#166534",color:"#fff",border:"none",borderRadius:"8px",padding:"9px",cursor:"pointer",fontSize:"13px",fontWeight:"bold"}}>{syncing?"⏳ Sincronizando...":"🔄 Sincronizar Agora"}</button>
            {syncLog.length>0&&<div style={{marginTop:"8px"}}>
              {syncLog.map((l,i)=><p key={i} style={{margin:"1px 0",fontSize:"11px",color:l.startsWith("❌")?"#f87171":"#94a3b8",fontFamily:"monospace"}}>{l}</p>)}
              {syncResult&&<p style={{margin:"6px 0 0",fontSize:"12px",color:"#4ade80",fontWeight:"600"}}>{syncResult.added} importados · {syncResult.skipped} ignorados</p>}
            </div>}
          </div>
        </div>
      )}
      </div>

      {/* Bottom Nav */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:"480px",background:"#1a1a2e",borderTop:"1px solid #2d2d44",display:"flex",justifyContent:"space-around",padding:"6px 0",zIndex:20}}>
        {tabs.map(([key,icon,label])=>(
          <button key={key} onClick={()=>setTab(key)} style={{background:"none",border:"none",color:tab===key?"#a78bfa":"#64748b",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:"1px",padding:"3px 8px",fontSize:"9px",fontWeight:tab===key?"700":"400"}}>
            <span style={{fontSize:"18px"}}>{icon}</span>{label}
          </button>
        ))}
      </div>
    </div>
  );
}
