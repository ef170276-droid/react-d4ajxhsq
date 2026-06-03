import React, { useState, useEffect, useRef } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const CATEGORIES = ["Alimentação","Transporte","Saúde","Moradia","Lazer","Roupas","Eletrônicos","Casa","Compras Online","Educação","Contas de Casa","Outros"];
const PAYMENTS = ["Pix","Débito","Crédito","Dinheiro","Boleto","Débito Automático"];
const PRIORITIES = ["Essencial","Importante","Lazer"];
const CAT_COLORS = {
  "Alimentação":"#f97316","Transporte":"#3b82f6","Saúde":"#22c55e","Moradia":"#a855f7",
  "Lazer":"#ec4899","Roupas":"#f43f5e","Eletrônicos":"#06b6d4","Casa":"#84cc16",
  "Compras Online":"#eab308","Educação":"#8b5cf6","Contas de Casa":"#38bdf8","Outros":"#6b7280"
};
const PRI_COLORS = {"Essencial":"#ef4444","Importante":"#f97316","Lazer":"#22c55e"};
const STORES = {
  amazon:{label:"Amazon",icon:"📦",cat:"Compras Online"},
  walmart:{label:"Walmart",icon:"🛒",cat:"Compras Online"},
  temu:{label:"Temu",icon:"🎁",cat:"Compras Online"},
  shein:{label:"Shein",icon:"👗",cat:"Roupas"},
  homedepot:{label:"Home Depot",icon:"🔨",cat:"Casa"},
};
const DEFAULT_BILLS = [
  {id:"internet",name:"Internet",icon:"📶",color:"#38bdf8",value:"",dueDay:"10",payment:"Débito Automático",active:true},
  {id:"luz",name:"Luz",icon:"💡",color:"#facc15",value:"",dueDay:"15",payment:"Boleto",active:true},
  {id:"agua",name:"Água",icon:"💧",color:"#60a5fa",value:"",dueDay:"20",payment:"Boleto",active:true},
  {id:"lixo",name:"Lixo",icon:"🗑️",color:"#4ade80",value:"",dueDay:"25",payment:"Boleto",active:true},
  {id:"tv",name:"TV por Assinatura",icon:"📺",color:"#c084fc",value:"",dueDay:"5",payment:"Débito Automático",active:true},
];

const fmt = v => v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const today = () => new Date().toISOString().split("T")[0];
const monthKey = () => { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; };

// ✅ localStorage helpers (funciona fora do Claude)
const load = (key, fallback) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

const iStyle = {width:"100%",padding:"10px",borderRadius:"8px",border:"1px solid #2d2d44",background:"#0f0f1a",color:"#e2e8f0",fontSize:"14px",boxSizing:"border-box"};

function Field({label,children}){return <div><label style={{display:"block",marginBottom:"4px",fontSize:"13px",color:"#94a3b8"}}>{label}</label>{children}</div>;}
function Card({title,value,sub,color}){return(
  <div style={{background:"#1e1e2e",borderRadius:"12px",padding:"16px"}}>
    <p style={{margin:"0 0 4px",color:"#64748b",fontSize:"12px"}}>{title}</p>
    <p style={{margin:"0 0 2px",fontSize:"19px",fontWeight:"bold",color}}>{value}</p>
    <p style={{margin:0,fontSize:"11px",color:"#475569"}}>{sub}</p>
  </div>
);}
function ExpRow({e,onDel}){return(
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #2d2d44"}}>
    <div style={{flex:1,minWidth:0}}>
      <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
        {e.storeIcon&&<span style={{fontSize:"14px"}}>{e.storeIcon}</span>}
        <p style={{margin:0,fontSize:"13px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.description||e.category}</p>
      </div>
      <p style={{margin:"2px 0 0",fontSize:"11px",color:"#64748b"}}>{e.category} · {e.payment} · {new Date(e.date+"T12:00:00").toLocaleDateString("pt-BR")}</p>
      <span style={{fontSize:"10px",color:PRI_COLORS[e.priority],background:PRI_COLORS[e.priority]+"22",padding:"1px 7px",borderRadius:"10px"}}>{e.priority}</span>
    </div>
    <div style={{textAlign:"right",marginLeft:"12px",flexShrink:0}}>
      <p style={{margin:0,fontWeight:"bold",color:"#f87171",fontSize:"14px"}}>{fmt(e.value)}</p>
      {e.source==="bill"&&<span style={{fontSize:"9px",color:"#38bdf8",background:"#0c2a3a",padding:"1px 5px",borderRadius:"6px"}}>🏠 Conta</span>}
      {onDel&&<button onClick={()=>onDel(e.id)} style={{display:"block",background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:"12px",padding:"2px",marginLeft:"auto"}}>🗑️</button>}
    </div>
  </div>
);}

export default function App(){
  const [tab,setTab]=useState("dashboard");
  const [expenses,setExpenses]=useState(()=>load("exp",[]));
  const [budget,setBudget]=useState(()=>load("budget",2000));
  const [budgetInput,setBudgetInput]=useState(()=>String(load("budget",2000)));
  const [form,setForm]=useState({value:"",description:"",category:"Compras Online",payment:"Crédito",priority:"Essencial",date:today()});
  const [scanning,setScanning]=useState(false);
  const [scanMsg,setScanMsg]=useState("");
  const [previewUrl,setPreviewUrl]=useState(null);
  const [bills,setBills]=useState(()=>load("bills",DEFAULT_BILLS));
  const [paidMonths,setPaidMonths]=useState(()=>load("paidMonths",{}));
  const [editBill,setEditBill]=useState(null);
  const fileRef=useRef();
  const camRef=useRef();

  const setAndSaveExp = d => { setExpenses(d); save("exp",d); };
  const setAndSaveBills = d => { setBills(d); save("bills",d); };
  const setAndSavePaid = d => { setPaidMonths(d); save("paidMonths",d); };

  const addExpense=(extra={})=>{
    if(!form.value||isNaN(form.value))return;
    const updated=[{...form,...extra,value:parseFloat(form.value),id:Date.now()},...expenses];
    setAndSaveExp(updated);
    setForm(f=>({...f,value:"",description:""}));
    setPreviewUrl(null);setScanMsg("");setTab("dashboard");
  };
  const delExpense=id=>setAndSaveExp(expenses.filter(e=>e.id!==id));
  const saveBudget=()=>{const v=parseFloat(budgetInput);if(!isNaN(v)){setBudget(v);save("budget",v);}};

  const markPaid=bill=>{
    const mk=monthKey(),key=`${bill.id}-${mk}`;
    if(paidMonths[key])return;
    setAndSavePaid({...paidMonths,[key]:true});
    if(!bill.value||isNaN(bill.value))return;
    const exp={id:Date.now(),value:parseFloat(bill.value),
      description:`${bill.name} — ${new Date().toLocaleDateString("pt-BR",{month:"long",year:"numeric"})}`,
      category:"Contas de Casa",payment:bill.payment,priority:"Essencial",
      date:today(),source:"bill",storeIcon:bill.icon};
    setAndSaveExp([exp,...expenses]);
  };
  const unmarkPaid=bill=>{
    const key=`${bill.id}-${monthKey()}`;
    const newPaid={...paidMonths};delete newPaid[key];
    setAndSavePaid(newPaid);
  };
  const updateBill=(id,field,val)=>setAndSaveBills(bills.map(b=>b.id===id?{...b,[field]:val}:b));

  const scanReceipt=async file=>{
    setScanning(true);setScanMsg("🔍 Analisando nota fiscal com IA...");
    setPreviewUrl(URL.createObjectURL(file));
    try{
      const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(file);});
      const resp=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,
          messages:[{role:"user",content:[
            {type:"image",source:{type:"base64",media_type:file.type,data:b64}},
            {type:"text",text:`Analise esta nota e extraia os dados. Responda APENAS JSON sem markdown:\n{"value":<número>,"description":"<loja>","category":"<Alimentação|Transporte|Saúde|Moradia|Lazer|Roupas|Eletrônicos|Casa|Compras Online|Educação|Contas de Casa|Outros>","date":"<YYYY-MM-DD>","payment":"<Pix|Débito|Crédito|Dinheiro|Boleto|Débito Automático>"}`}
          ]}]})
      });
      const d=await resp.json();
      const txt=d.content.map(i=>i.text||"").join("").replace(/```json|```/g,"").trim();
      const p=JSON.parse(txt);
      setForm(f=>({...f,value:String(p.value||""),description:p.description||"",
        category:CATEGORIES.includes(p.category)?p.category:"Outros",
        date:p.date||today(),payment:PAYMENTS.includes(p.payment)?p.payment:"Boleto"}));
      setScanMsg("✅ Nota lida! Confira e ajuste se necessário.");
    }catch{setScanMsg("❌ Não foi possível ler. Preencha manualmente.");}
    setScanning(false);
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

  const tabs=[["dashboard","📊","Dashboard"],["bills","🏠","Contas"],["add","➕","Adicionar"],["history","📋","Histórico"],["charts","📈","Gráficos"]];

  return(
    <div style={{fontFamily:"system-ui,sans-serif",background:"#0f0f1a",color:"#e2e8f0",minHeight:"100vh",maxWidth:"480px",margin:"0 auto",paddingBottom:"80px"}}>
      <div style={{background:"#1e1e2e",padding:"14px 20px",borderBottom:"1px solid #2d2d44",position:"sticky",top:0,zIndex:10}}>
        <h1 style={{margin:0,fontSize:"17px",color:"#a78bfa",textAlign:"center"}}>💸 Controle de Gastos</h1>
      </div>
      <div style={{padding:"16px"}}>

      {tab==="dashboard"&&(
        <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
            <Card title="Hoje" value={fmt(tTotal)} sub={`${tExp.length} transação${tExp.length!==1?"s":""}`} color="#22c55e"/>
            <Card title="Este Mês" value={fmt(mTotal)} sub={`${mExp.length} transação${mExp.length!==1?"s":""}`} color="#a78bfa"/>
          </div>
          <div style={{background:"#1e1e2e",borderRadius:"12px",padding:"16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}>
              <span style={{fontSize:"13px",color:"#94a3b8"}}>Orçamento Mensal</span>
              <span style={{fontSize:"13px",fontWeight:"bold",color:bPct>80?"#ef4444":bPct>50?"#f97316":"#22c55e"}}>{bPct.toFixed(0)}%</span>
            </div>
            <div style={{background:"#2d2d44",borderRadius:"6px",height:"10px"}}>
              <div style={{width:`${bPct}%`,height:"100%",borderRadius:"6px",background:bPct>80?"#ef4444":bPct>50?"#f97316":"#22c55e",transition:"width .5s"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:"6px",fontSize:"11px",color:"#64748b"}}>
              <span>{fmt(mTotal)}</span><span>de {fmt(budget)}</span>
            </div>
            <div style={{display:"flex",gap:"8px",marginTop:"12px"}}>
              <input type="number" value={budgetInput} onChange={e=>setBudgetInput(e.target.value)} placeholder="Orçamento" style={{...iStyle,flex:1}}/>
              <button onClick={saveBudget} style={{background:"#7c3aed",color:"#fff",border:"none",borderRadius:"8px",padding:"8px 14px",cursor:"pointer",fontSize:"13px"}}>Salvar</button>
            </div>
          </div>
          <div onClick={()=>setTab("bills")} style={{background:"linear-gradient(135deg,#0c2233,#0f1f33)",border:"1px solid #1e3a5f",borderRadius:"12px",padding:"14px",cursor:"pointer"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <span style={{fontSize:"20px"}}>🏠</span>
                <div>
                  <p style={{margin:0,fontWeight:"600",fontSize:"13px",color:"#38bdf8"}}>Contas de Casa</p>
                  <p style={{margin:0,fontSize:"11px",color:"#64748b"}}>{billsPaid}/{activeBills.length} pagas este mês</p>
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <p style={{margin:0,fontWeight:"bold",color:"#38bdf8",fontSize:"16px"}}>{fmt(billsTotal)}</p>
                <p style={{margin:0,fontSize:"10px",color:"#475569"}}>total mensal</p>
              </div>
            </div>
            <div style={{display:"flex",gap:"6px"}}>
              {activeBills.map(b=>{
                const paid=!!paidMonths[`${b.id}-${mk}`];
                return <div key={b.id} style={{flex:1,background:paid?"#166534":"#2d2d44",borderRadius:"6px",padding:"4px",textAlign:"center"}}>
                  <p style={{margin:0,fontSize:"16px"}}>{b.icon}</p>
                  <p style={{margin:0,fontSize:"9px",color:paid?"#4ade80":"#94a3b8"}}>{paid?"✓":""}</p>
                </div>;
              })}
            </div>
          </div>
          <div style={{background:"#1e1e2e",borderRadius:"12px",padding:"16px"}}>
            <p style={{margin:"0 0 10px",fontSize:"13px",color:"#94a3b8",fontWeight:"600"}}>Últimas transações</p>
            {expenses.slice(0,5).map(e=><ExpRow key={e.id} e={e}/>)}
            {expenses.length===0&&<p style={{color:"#475569",fontSize:"13px",textAlign:"center",padding:"20px 0"}}>Nenhum gasto registrado ainda</p>}
            {expenses.length>5&&<p style={{color:"#7c3aed",fontSize:"12px",textAlign:"center",marginTop:"8px",cursor:"pointer"}} onClick={()=>setTab("history")}>Ver todos →</p>}
          </div>
        </div>
      )}

      {tab==="bills"&&(
        <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
          <div style={{background:"#0c2233",border:"1px solid #1e3a5f",borderRadius:"12px",padding:"14px",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px",textAlign:"center"}}>
            <div><p style={{margin:"0 0 2px",fontSize:"20px",fontWeight:"bold",color:"#38bdf8"}}>{fmt(billsTotal)}</p><p style={{margin:0,fontSize:"11px",color:"#64748b"}}>Total mensal</p></div>
            <div><p style={{margin:"0 0 2px",fontSize:"20px",fontWeight:"bold",color:"#4ade80"}}>{billsPaid}</p><p style={{margin:0,fontSize:"11px",color:"#64748b"}}>Pagas</p></div>
            <div><p style={{margin:"0 0 2px",fontSize:"20px",fontWeight:"bold",color:"#f87171"}}>{activeBills.length-billsPaid}</p><p style={{margin:0,fontSize:"11px",color:"#64748b"}}>Pendentes</p></div>
          </div>
          {bills.map(bill=>{
            const paid=!!paidMonths[`${bill.id}-${mk}`];
            const isEditing=editBill===bill.id;
            return(
              <div key={bill.id} style={{background:"#1e1e2e",borderRadius:"12px",overflow:"hidden",border:paid?"1px solid #166534":"1px solid #2d2d44"}}>
                <div style={{padding:"14px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                    <div style={{width:"44px",height:"44px",borderRadius:"12px",background:bill.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"22px",flexShrink:0}}>{bill.icon}</div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                        <p style={{margin:0,fontWeight:"600",fontSize:"15px"}}>{bill.name}</p>
                        {paid&&<span style={{fontSize:"10px",color:"#4ade80",background:"#16683420",padding:"2px 7px",borderRadius:"8px"}}>✓ Paga</span>}
                      </div>
                      <p style={{margin:"3px 0 0",fontSize:"12px",color:"#64748b"}}>Venc. dia {bill.dueDay} · {bill.payment}</p>
                    </div>
                    <p style={{margin:0,fontWeight:"bold",fontSize:"16px",color:bill.color,flexShrink:0}}>{bill.value?fmt(parseFloat(bill.value)):"—"}</p>
                  </div>
                  <div style={{display:"flex",gap:"8px",marginTop:"12px"}}>
                    {!paid
                      ? <button onClick={()=>markPaid(bill)} disabled={!bill.value} style={{flex:1,background:bill.value?"#166534":"#2d2d44",color:bill.value?"#4ade80":"#64748b",border:"none",borderRadius:"8px",padding:"8px",cursor:bill.value?"pointer":"not-allowed",fontSize:"13px",fontWeight:"600"}}>
                          {bill.value?"✓ Marcar como paga":"Defina o valor"}
                        </button>
                      : <button onClick={()=>unmarkPaid(bill)} style={{flex:1,background:"#2d2d44",color:"#94a3b8",border:"none",borderRadius:"8px",padding:"8px",cursor:"pointer",fontSize:"13px"}}>↩ Desmarcar</button>
                    }
                    <button onClick={()=>setEditBill(isEditing?null:bill.id)} style={{background:"#2d2d44",color:"#94a3b8",border:"none",borderRadius:"8px",padding:"8px 12px",cursor:"pointer"}}>
                      {isEditing?"✕":"✏️"}
                    </button>
                  </div>
                </div>
                {isEditing&&(
                  <div style={{background:"#0f0f1a",padding:"14px",borderTop:"1px solid #2d2d44",display:"flex",flexDirection:"column",gap:"10px"}}>
                    <Field label="Valor mensal (R$)"><input type="number" placeholder="Ex: 99.90" value={bill.value} onChange={e=>updateBill(bill.id,"value",e.target.value)} style={iStyle}/></Field>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
                      <Field label="Dia de vencimento"><input type="number" min="1" max="31" value={bill.dueDay} onChange={e=>updateBill(bill.id,"dueDay",e.target.value)} style={iStyle}/></Field>
                      <Field label="Pagamento"><select value={bill.payment} onChange={e=>updateBill(bill.id,"payment",e.target.value)} style={iStyle}>{PAYMENTS.map(p=><option key={p}>{p}</option>)}</select></Field>
                    </div>
                    <button onClick={()=>setEditBill(null)} style={{background:"#7c3aed",color:"#fff",border:"none",borderRadius:"8px",padding:"9px",cursor:"pointer",fontWeight:"bold"}}>Salvar</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab==="add"&&(
        <div style={{background:"#1e1e2e",borderRadius:"12px",padding:"16px",display:"flex",flexDirection:"column",gap:"14px"}}>
          <div style={{textAlign:"center",background:"#0f0f1a",borderRadius:"10px",padding:"16px"}}>
            <p style={{margin:"0 0 12px",color:"#a78bfa",fontWeight:"600",fontSize:"14px"}}>📷 Escanear Nota Fiscal (IA)</p>
            <input ref={camRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>e.target.files[0]&&scanReceipt(e.target.files[0])}/>
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>e.target.files[0]&&scanReceipt(e.target.files[0])}/>
            <div style={{display:"flex",gap:"8px",justifyContent:"center"}}>
              <button onClick={()=>camRef.current.click()} disabled={scanning} style={{background:"#7c3aed",color:"#fff",border:"none",borderRadius:"10px",padding:"10px 16px",cursor:"pointer",fontSize:"13px"}}>📷 Câmera</button>
              <button onClick={()=>fileRef.current.click()} disabled={scanning} style={{background:"#1e1e2e",color:"#a78bfa",border:"1px solid #7c3aed",borderRadius:"10px",padding:"10px 16px",cursor:"pointer",fontSize:"13px"}}>🖼️ Galeria</button>
            </div>
            {previewUrl&&<img src={previewUrl} alt="nota" style={{maxWidth:"100%",maxHeight:"130px",objectFit:"contain",borderRadius:"8px",marginTop:"10px"}}/>}
            {scanMsg&&<p style={{margin:"8px 0 0",fontSize:"13px",color:scanMsg.startsWith("✅")?"#22c55e":scanMsg.startsWith("❌")?"#ef4444":"#a78bfa"}}>{scanMsg}</p>}
          </div>
          <Field label="Valor (R$)"><input type="number" placeholder="0,00" value={form.value} onChange={e=>setForm({...form,value:e.target.value})} style={iStyle}/></Field>
          <Field label="Descrição"><input type="text" placeholder="Ex: Conta de luz" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} style={iStyle}/></Field>
          <Field label="Categoria"><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={iStyle}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></Field>
          <Field label="Método de Pagamento"><select value={form.payment} onChange={e=>setForm({...form,payment:e.target.value})} style={iStyle}>{PAYMENTS.map(p=><option key={p}>{p}</option>)}</select></Field>
          <Field label="Prioridade"><select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})} style={iStyle}>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select></Field>
          <Field label="Data"><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={iStyle}/></Field>
          <button onClick={()=>addExpense()} style={{background:form.value?"#7c3aed":"#3d2d6e",color:"#fff",border:"none",borderRadius:"10px",padding:"13px",cursor:"pointer",fontSize:"15px",fontWeight:"bold"}}>+ Adicionar Gasto</button>
        </div>
      )}

      {tab==="history"&&(
        <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
          <p style={{color:"#64748b",fontSize:"12px",margin:"0 0 8px"}}>{expenses.length} transação{expenses.length!==1?"s":""}</p>
          {expenses.length===0&&<p style={{color:"#475569",textAlign:"center",padding:"40px 0"}}>Nenhum gasto registrado ainda</p>}
          {expenses.map(e=>(
            <div key={e.id} style={{background:"#1e1e2e",borderRadius:"10px",padding:"4px 12px"}}>
              <ExpRow e={e} onDel={delExpense}/>
            </div>
          ))}
        </div>
      )}

      {tab==="charts"&&(
        <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
          <div style={{background:"#1e1e2e",borderRadius:"12px",padding:"16px"}}>
            <p style={{margin:"0 0 12px",color:"#94a3b8",fontSize:"13px",fontWeight:"600"}}>Gastos por Categoria — Mês Atual</p>
            {catData.length>0?(
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={catData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({percent})=>`${(percent*100).toFixed(0)}%`}>
                      {catData.map(d=><Cell key={d.name} fill={CAT_COLORS[d.name]||"#6b7280"}/>)}
                    </Pie>
                    <Tooltip formatter={v=>fmt(v)} contentStyle={{background:"#1e1e2e",border:"1px solid #2d2d44",color:"#e2e8f0"}}/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{display:"flex",flexWrap:"wrap",gap:"8px",marginTop:"8px"}}>
                  {catData.map(d=>(
                    <div key={d.name} style={{display:"flex",alignItems:"center",gap:"4px"}}>
                      <div style={{width:10,height:10,borderRadius:"50%",background:CAT_COLORS[d.name]}}/>
                      <span style={{fontSize:"12px",color:"#94a3b8"}}>{d.name}: {fmt(d.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ):<p style={{color:"#475569",textAlign:"center",padding:"30px 0"}}>Sem dados este mês</p>}
          </div>
          <div style={{background:"#1e1e2e",borderRadius:"12px",padding:"16px"}}>
            <p style={{margin:"0 0 12px",color:"#94a3b8",fontSize:"13px",fontWeight:"600"}}>Últimos 7 Dias</p>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={last7} margin={{top:0,right:0,left:-20,bottom:0}}>
                <XAxis dataKey="day" tick={{fill:"#64748b",fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:"#64748b",fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip formatter={v=>fmt(v)} contentStyle={{background:"#1e1e2e",border:"1px solid #2d2d44",color:"#e2e8f0"}}/>
                <Bar dataKey="total" fill="#7c3aed" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      </div>

      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:"480px",background:"#1e1e2e",borderTop:"1px solid #2d2d44",display:"flex",justifyContent:"space-around",padding:"8px 0",zIndex:20}}>
        {tabs.map(([key,icon,label])=>(
          <button key={key} onClick={()=>setTab(key)} style={{background:"none",border:"none",color:tab===key?"#a78bfa":"#64748b",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:"2px",padding:"4px 6px",fontSize:"9px",fontWeight:tab===key?"600":"400"}}>
            <span style={{fontSize:"16px"}}>{icon}</span>{label}
          </button>
        ))}
      </div>
    </div>
  );
}
