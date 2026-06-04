import React, { useState, useRef } from "react";
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
const DEFAULT_BILLS = [
  {id:"internet",name:"Internet",icon:"📶",color:"#38bdf8",value:"",dueDay:"10",payment:"Débito Automático",active:true},
  {id:"luz",name:"Luz",icon:"💡",color:"#facc15",value:"",dueDay:"15",payment:"Boleto",active:true},
  {id:"agua",name:"Água",icon:"💧",color:"#60a5fa",value:"",dueDay:"20",payment:"Boleto",active:true},
  {id:"lixo",name:"Lixo",icon:"🗑️",color:"#4ade80",value:"",dueDay:"25",payment:"Boleto",active:true},
  {id:"tv",name:"TV",icon:"📺",color:"#c084fc",value:"",dueDay:"5",payment:"Débito Automático",active:true},
];

const fmt = v => v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const today = () => new Date().toISOString().split("T")[0];
const monthKey = () => { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; };
const load = (key, fallback) => { try { const v=localStorage.getItem(key); return v?JSON.parse(v):fallback; } catch { return fallback; } };
const save = (key, val) => { try { localStorage.setItem(key,JSON.stringify(val)); } catch {} };

const iStyle = {width:"100%",padding:"10px 12px",borderRadius:"10px",border:"1px solid #e5e7eb",background:"#f9fafb",color:"#111827",fontSize:"14px",boxSizing:"border-box",outline:"none"};

function Field({label,children}){
  return <div><label style={{display:"block",marginBottom:"5px",fontSize:"12px",color:"#6b7280",fontWeight:"600",textTransform:"uppercase",letterSpacing:"0.5px"}}>{label}</label>{children}</div>;
}

export default function App(){
  const [tab,setTab]=useState("dashboard");
  const [expenses,setExpenses]=useState(()=>load("exp",[]));
  const [budget,setBudget]=useState(()=>load("budget",2000));
  const [budgetInput,setBudgetInput]=useState(()=>String(load("budget",2000)));
  const [form,setForm]=useState({value:"",description:"",category:"Alimentação",payment:"Pix",priority:"Essencial",date:today()});
  const [scanning,setScanning]=useState(false);
  const [scanMsg,setScanMsg]=useState("");
  const [previewUrl,setPreviewUrl]=useState(null);
  const [bills,setBills]=useState(()=>load("bills",DEFAULT_BILLS));
  const [paidMonths,setPaidMonths]=useState(()=>load("paidMonths",{}));
  const [editBill,setEditBill]=useState(null);
  const fileRef=useRef();
  const camRef=useRef();

  const setAndSaveExp = d=>{setExpenses(d);save("exp",d);};
  const setAndSaveBills = d=>{setBills(d);save("bills",d);};
  const setAndSavePaid = d=>{setPaidMonths(d);save("paidMonths",d);};

  const addExpense=()=>{
    if(!form.value||isNaN(form.value))return;
    const updated=[{...form,value:parseFloat(form.value),id:Date.now()},...expenses];
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
      category:"Contas de Casa",payment:bill.payment,priority:"Essencial",date:today(),source:"bill",storeIcon:bill.icon};
    setAndSaveExp([exp,...expenses]);
  };
  const unmarkPaid=bill=>{
    const key=`${bill.id}-${monthKey()}`;
    const newPaid={...paidMonths};delete newPaid[key];
    setAndSavePaid(newPaid);
  };
  const updateBill=(id,field,val)=>setAndSaveBills(bills.map(b=>b.id===id?{...b,[field]:val}:b));

  const scanReceipt=async file=>{
    setScanning(true);setScanMsg("🔍 Analisando com IA...");
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
      setScanMsg("✅ Nota lida!");
    }catch{setScanMsg("❌ Não foi possível ler.");}
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

  const tabs=[["dashboard","🏠","Início"],["bills","💡","Contas"],["add","➕","Adicionar"],["history","📋","Histórico"],["charts","📊","Gráficos"]];

  const s = {
    page: {fontFamily:"system-ui,sans-serif",background:"#f3f4f6",color:"#111827",display:"flex",flexDirection:"column",height:"100vh",width:"100%",maxWidth:"480px",margin:"0 auto"},
    header: {background:"#fff",padding:"14px 16px",borderBottom:"1px solid #e5e7eb",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0},
    content: {flex:1,overflowY:"auto",overflowX:"hidden",padding:"12px"},
    nav: {background:"#fff",borderTop:"1px solid #e5e7eb",display:"flex",justifyContent:"space-around",padding:"6px 0 8px",flexShrink:0},
    card: {background:"#fff",borderRadius:"14px",padding:"14px",marginBottom:"10px",boxShadow:"0 1px 3px rgba(0,0,0,0.07)"},
    btn: {background:"#6366f1",color:"#fff",border:"none",borderRadius:"10px",padding:"12px",cursor:"pointer",fontSize:"15px",fontWeight:"700",width:"100%"},
    tag: (c)=>({fontSize:"10px",color:c,background:c+"22",padding:"2px 8px",borderRadius:"10px",fontWeight:"600"}),
  };

  return(
    <div style={s.page}>
      {/* HEADER */}
      <div style={s.header}>
        <span style={{fontSize:"20px"}}>💸</span>
        <h1 style={{margin:0,fontSize:"16px",fontWeight:"700",color:"#111827"}}>Controle de Gastos</h1>
        <span style={{fontSize:"12px",color:"#6b7280"}}>{new Date().toLocaleDateString("pt-BR",{month:"short",day:"numeric"})}</span>
      </div>

      {/* CONTENT */}
      <div style={s.content}>

        {/* DASHBOARD */}
        {tab==="dashboard"&&(
          <div>
            {/* Resumo */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"10px"}}>
              <div style={{...s.card,marginBottom:0,background:"linear-gradient(135deg,#6366f1,#8b5cf6)"}}>
                <p style={{margin:"0 0 2px",fontSize:"11px",color:"rgba(255,255,255,0.8)"}}>Este Mês</p>
                <p style={{margin:0,fontSize:"20px",fontWeight:"800",color:"#fff"}}>{fmt(mTotal)}</p>
                <p style={{margin:0,fontSize:"10px",color:"rgba(255,255,255,0.7)"}}>{mExp.length} gastos</p>
              </div>
              <div style={{...s.card,marginBottom:0,background:"linear-gradient(135deg,#10b981,#059669)"}}>
                <p style={{margin:"0 0 2px",fontSize:"11px",color:"rgba(255,255,255,0.8)"}}>Hoje</p>
                <p style={{margin:0,fontSize:"20px",fontWeight:"800",color:"#fff"}}>{fmt(tTotal)}</p>
                <p style={{margin:0,fontSize:"10px",color:"rgba(255,255,255,0.7)"}}>{tExp.length} gastos</p>
              </div>
            </div>

            {/* Orçamento */}
            <div style={s.card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                <span style={{fontSize:"13px",fontWeight:"600",color:"#374151"}}>Orçamento Mensal</span>
                <span style={{fontSize:"12px",fontWeight:"700",color:bPct>80?"#ef4444":bPct>50?"#f97316":"#10b981"}}>{bPct.toFixed(0)}%</span>
              </div>
              <div style={{background:"#f3f4f6",borderRadius:"6px",height:"8px",marginBottom:"8px"}}>
                <div style={{width:`${bPct}%`,height:"100%",borderRadius:"6px",background:bPct>80?"#ef4444":bPct>50?"#f97316":"#10b981",transition:"width .5s"}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:"11px",color:"#9ca3af",marginBottom:"10px"}}>
                <span>{fmt(mTotal)} gastos</span><span>limite {fmt(budget)}</span>
              </div>
              <div style={{display:"flex",gap:"8px"}}>
                <input type="number" value={budgetInput} onChange={e=>setBudgetInput(e.target.value)} placeholder="Orçamento" style={{...iStyle,flex:1}}/>
                <button onClick={saveBudget} style={{background:"#6366f1",color:"#fff",border:"none",borderRadius:"10px",padding:"0 16px",cursor:"pointer",fontWeight:"700",fontSize:"13px"}}>Salvar</button>
              </div>
            </div>

            {/* Contas */}
            <div style={{...s.card,cursor:"pointer"}} onClick={()=>setTab("bills")}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
                <div>
                  <p style={{margin:0,fontWeight:"700",fontSize:"14px",color:"#111827"}}>💡 Contas de Casa</p>
                  <p style={{margin:"2px 0 0",fontSize:"11px",color:"#9ca3af"}}>{billsPaid}/{activeBills.length} pagas · {fmt(billsTotal)}/mês</p>
                </div>
                <span style={{color:"#6366f1",fontSize:"18px"}}>›</span>
              </div>
              <div style={{display:"flex",gap:"6px"}}>
                {activeBills.map(b=>{
                  const paid=!!paidMonths[`${b.id}-${mk}`];
                  return <div key={b.id} style={{flex:1,background:paid?"#d1fae5":"#f3f4f6",borderRadius:"8px",padding:"6px 4px",textAlign:"center",border:paid?"1px solid #10b981":"1px solid #e5e7eb"}}>
                    <p style={{margin:0,fontSize:"16px"}}>{b.icon}</p>
                    <p style={{margin:"2px 0 0",fontSize:"9px",color:paid?"#059669":"#9ca3af",fontWeight:"600"}}>{paid?"✓":"—"}</p>
                  </div>;
                })}
              </div>
            </div>

            {/* Últimas transações */}
            <div style={s.card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
                <p style={{margin:0,fontSize:"14px",fontWeight:"700",color:"#111827"}}>Últimas transações</p>
                {expenses.length>3&&<span onClick={()=>setTab("history")} style={{fontSize:"12px",color:"#6366f1",cursor:"pointer",fontWeight:"600"}}>Ver tudo</span>}
              </div>
              {expenses.length===0&&<p style={{color:"#9ca3af",fontSize:"13px",textAlign:"center",padding:"16px 0"}}>Nenhum gasto ainda 👋</p>}
              {expenses.slice(0,4).map(e=>(
                <div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #f3f4f6"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                    <div style={{width:"36px",height:"36px",borderRadius:"10px",background:CAT_COLORS[e.category]+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",flexShrink:0}}>
                      {e.storeIcon||"💳"}
                    </div>
                    <div>
                      <p style={{margin:0,fontSize:"13px",fontWeight:"600",color:"#111827"}}>{e.description||e.category}</p>
                      <p style={{margin:0,fontSize:"11px",color:"#9ca3af"}}>{e.category} · {new Date(e.date+"T12:00:00").toLocaleDateString("pt-BR")}</p>
                    </div>
                  </div>
                  <p style={{margin:0,fontWeight:"700",color:"#ef4444",fontSize:"14px"}}>-{fmt(e.value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONTAS */}
        {tab==="bills"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",marginBottom:"10px"}}>
              {[{label:"Total/mês",val:fmt(billsTotal),color:"#6366f1"},{label:"Pagas",val:billsPaid,color:"#10b981"},{label:"Pendentes",val:activeBills.length-billsPaid,color:"#ef4444"}].map(c=>(
                <div key={c.label} style={{...s.card,marginBottom:0,textAlign:"center"}}>
                  <p style={{margin:"0 0 2px",fontSize:"17px",fontWeight:"800",color:c.color}}>{c.val}</p>
                  <p style={{margin:0,fontSize:"10px",color:"#9ca3af"}}>{c.label}</p>
                </div>
              ))}
            </div>
            {bills.map(bill=>{
              const paid=!!paidMonths[`${bill.id}-${mk}`];
              const isEditing=editBill===bill.id;
              return(
                <div key={bill.id} style={{...s.card,border:paid?"1.5px solid #10b981":"1.5px solid #e5e7eb"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                    <div style={{width:"42px",height:"42px",borderRadius:"12px",background:bill.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"22px",flexShrink:0}}>{bill.icon}</div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                        <p style={{margin:0,fontWeight:"700",fontSize:"14px",color:"#111827"}}>{bill.name}</p>
                        {paid&&<span style={{fontSize:"10px",color:"#10b981",background:"#d1fae5",padding:"1px 7px",borderRadius:"8px",fontWeight:"700"}}>✓ Paga</span>}
                      </div>
                      <p style={{margin:"2px 0 0",fontSize:"11px",color:"#9ca3af"}}>Venc. dia {bill.dueDay} · {bill.payment}</p>
                    </div>
                    <p style={{margin:0,fontWeight:"800",fontSize:"15px",color:bill.color}}>{bill.value?fmt(parseFloat(bill.value)):"—"}</p>
                  </div>
                  <div style={{display:"flex",gap:"8px",marginTop:"10px"}}>
                    {!paid
                      ? <button onClick={()=>markPaid(bill)} disabled={!bill.value} style={{flex:1,background:bill.value?"#10b981":"#f3f4f6",color:bill.value?"#fff":"#9ca3af",border:"none",borderRadius:"8px",padding:"8px",cursor:bill.value?"pointer":"not-allowed",fontSize:"13px",fontWeight:"700"}}>
                          {bill.value?"✓ Marcar paga":"Defina o valor"}
                        </button>
                      : <button onClick={()=>unmarkPaid(bill)} style={{flex:1,background:"#f3f4f6",color:"#6b7280",border:"none",borderRadius:"8px",padding:"8px",cursor:"pointer",fontSize:"13px"}}>↩ Desmarcar</button>
                    }
                    <button onClick={()=>setEditBill(isEditing?null:bill.id)} style={{background:"#f3f4f6",color:"#6b7280",border:"none",borderRadius:"8px",padding:"8px 12px",cursor:"pointer"}}>✏️</button>
                  </div>
                  {isEditing&&(
                    <div style={{marginTop:"12px",paddingTop:"12px",borderTop:"1px solid #f3f4f6",display:"flex",flexDirection:"column",gap:"10px"}}>
                      <Field label="Valor (R$)"><input type="number" placeholder="Ex: 99.90" value={bill.value} onChange={e=>updateBill(bill.id,"value",e.target.value)} style={iStyle}/></Field>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
                        <Field label="Dia venc."><input type="number" min="1" max="31" value={bill.dueDay} onChange={e=>updateBill(bill.id,"dueDay",e.target.value)} style={iStyle}/></Field>
                        <Field label="Pagamento"><select value={bill.payment} onChange={e=>updateBill(bill.id,"payment",e.target.value)} style={iStyle}>{PAYMENTS.map(p=><option key={p}>{p}</option>)}</select></Field>
                      </div>
                      <button onClick={()=>setEditBill(null)} style={{...s.btn,padding:"10px"}}>Salvar</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ADICIONAR */}
        {tab==="add"&&(
          <div style={s.card}>
            <div style={{background:"#f3f4f6",borderRadius:"12px",padding:"14px",marginBottom:"14px",textAlign:"center"}}>
              <p style={{margin:"0 0 10px",fontWeight:"700",fontSize:"13px",color:"#374151"}}>📷 Escanear Nota com IA</p>
              <input ref={camRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>e.target.files[0]&&scanReceipt(e.target.files[0])}/>
              <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>e.target.files[0]&&scanReceipt(e.target.files[0])}/>
              <div style={{display:"flex",gap:"8px",justifyContent:"center"}}>
                <button onClick={()=>camRef.current.click()} disabled={scanning} style={{background:"#6366f1",color:"#fff",border:"none",borderRadius:"10px",padding:"9px 16px",cursor:"pointer",fontSize:"13px",fontWeight:"600"}}>📷 Câmera</button>
                <button onClick={()=>fileRef.current.click()} disabled={scanning} style={{background:"#fff",color:"#6366f1",border:"1.5px solid #6366f1",borderRadius:"10px",padding:"9px 16px",cursor:"pointer",fontSize:"13px",fontWeight:"600"}}>🖼️ Galeria</button>
              </div>
              {previewUrl&&<img src={previewUrl} alt="nota" style={{maxWidth:"100%",maxHeight:"120px",objectFit:"contain",borderRadius:"8px",marginTop:"10px"}}/>}
              {scanMsg&&<p style={{margin:"8px 0 0",fontSize:"12px",color:scanMsg.startsWith("✅")?"#10b981":scanMsg.startsWith("❌")?"#ef4444":"#6366f1",fontWeight:"600"}}>{scanMsg}</p>}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <Field label="Valor (R$)"><input type="number" placeholder="0,00" value={form.value} onChange={e=>setForm({...form,value:e.target.value})} style={iStyle}/></Field>
              <Field label="Descrição"><input type="text" placeholder="Ex: Almoço no restaurante" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} style={iStyle}/></Field>
              <Field label="Categoria"><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={iStyle}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></Field>
              <Field label="Pagamento"><select value={form.payment} onChange={e=>setForm({...form,payment:e.target.value})} style={iStyle}>{PAYMENTS.map(p=><option key={p}>{p}</option>)}</select></Field>
              <Field label="Prioridade"><select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})} style={iStyle}>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select></Field>
              <Field label="Data"><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={iStyle}/></Field>
              <button onClick={addExpense} style={{...s.btn,opacity:form.value?1:0.5}}>+ Adicionar Gasto</button>
            </div>
          </div>
        )}

        {/* HISTÓRICO */}
        {tab==="history"&&(
          <div>
            <p style={{margin:"0 0 10px",fontSize:"12px",color:"#9ca3af",fontWeight:"600"}}>{expenses.length} TRANSAÇÕES</p>
            {expenses.length===0&&<div style={{...s.card,textAlign:"center",padding:"30px"}}><p style={{color:"#9ca3af"}}>Nenhum gasto registrado ainda 👋</p></div>}
            {expenses.map(e=>(
              <div key={e.id} style={{...s.card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:"10px",flex:1,minWidth:0}}>
                  <div style={{width:"38px",height:"38px",borderRadius:"10px",background:CAT_COLORS[e.category]+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",flexShrink:0}}>
                    {e.storeIcon||"💳"}
                  </div>
                  <div style={{minWidth:0}}>
                    <p style={{margin:0,fontSize:"13px",fontWeight:"600",color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.description||e.category}</p>
                    <p style={{margin:0,fontSize:"11px",color:"#9ca3af"}}>{e.category} · {new Date(e.date+"T12:00:00").toLocaleDateString("pt-BR")}</p>
                    <span style={s.tag(PRI_COLORS[e.priority])}>{e.priority}</span>
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0,marginLeft:"10px"}}>
                  <p style={{margin:0,fontWeight:"700",color:"#ef4444",fontSize:"14px"}}>-{fmt(e.value)}</p>
                  <button onClick={()=>delExpense(e.id)} style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:"16px",padding:"2px"}}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* GRÁFICOS */}
        {tab==="charts"&&(
          <div>
            <div style={s.card}>
              <p style={{margin:"0 0 12px",fontSize:"14px",fontWeight:"700",color:"#111827"}}>Por Categoria — Mês Atual</p>
              {catData.length>0?(
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={catData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({percent})=>`${(percent*100).toFixed(0)}%`}>
                        {catData.map(d=><Cell key={d.name} fill={CAT_COLORS[d.name]||"#6b7280"}/>)}
                      </Pie>
                      <Tooltip formatter={v=>fmt(v)} contentStyle={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:"8px",fontSize:"12px"}}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"6px",marginTop:"8px"}}>
                    {catData.map(d=>(
                      <div key={d.name} style={{display:"flex",alignItems:"center",gap:"4px"}}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:CAT_COLORS[d.name]}}/>
                        <span style={{fontSize:"11px",color:"#6b7280"}}>{d.name}: {fmt(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ):<p style={{color:"#9ca3af",textAlign:"center",padding:"24px 0"}}>Sem dados este mês</p>}
            </div>
            <div style={s.card}>
              <p style={{margin:"0 0 12px",fontSize:"14px",fontWeight:"700",color:"#111827"}}>Últimos 7 Dias</p>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={last7} margin={{top:0,right:0,left:-20,bottom:0}}>
                  <XAxis dataKey="day" tick={{fill:"#9ca3af",fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:"#9ca3af",fontSize:10}} axisLine={false} tickLine={false}/>
                  <Tooltip formatter={v=>fmt(v)} contentStyle={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:"8px",fontSize:"12px"}}/>
                  <Bar dataKey="total" fill="#6366f1" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div style={s.nav}>
        {tabs.map(([key,icon,label])=>(
          <button key={key} onClick={()=>setTab(key)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:"2px",padding:"4px 10px",borderRadius:"10px",transition:"background .15s",backgroundColor:tab===key?"#ede9fe":"transparent"}}>
            <span style={{fontSize:"18px"}}>{icon}</span>
            <span style={{fontSize:"9px",fontWeight:tab===key?"700":"500",color:tab===key?"#6366f1":"#9ca3af"}}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
