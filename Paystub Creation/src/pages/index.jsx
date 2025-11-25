import React, { useState, useMemo, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Plus, Trash2, Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MILE_RATE = 0.2;

export default function PayStubApp() {
  const printableRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [contractor, setContractor] = useState({ name: "", email: "", id: "" });
  const [period, setPeriod] = useState({ start: "", end: "", payDate: "" });
  const [paidVia, setPaidVia] = useState("");

  const categories = [
    "Photo Capture",
    "Estimate Writing",
    "NADA Research",
    "Salvage Bid",
    "CCC Profile",
    "Photo Renaming",
    "Bookkeeping",
    "Others",
  ];

  const [items, setItems] = useState([]);

  const addItem = () =>
    setItems([
      ...items,
      { id: (Date.now() + Math.random()).toString(36), category: categories[0], qty: 1, rate: 0, miles: 0, note: "" },
    ]);

  const removeItem = (id) => setItems(items.filter((x) => x.id !== id));

  const totals = useMemo(() => {
    const earnings = items.reduce((sum, x) => sum + Number(x.qty || 0) * Number(x.rate || 0), 0);
    const mileage = items.reduce(
      (sum, x) => sum + (x.category === "Photo Capture" ? Number(x.miles || 0) * MILE_RATE : 0),
      0
    );
    const total = earnings + mileage;
    return { earnings, mileage, total };
  }, [items]);

  const exportPDF = async () => {
    try {
      setBusy(true);
      const node = printableRef.current;
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "pt", "a4");
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, w, h);
      pdf.save(`${(contractor.name || "contractor").replace(/\s+/g,"_")}_stub_${period.end || "pay"}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Failed to export PDF (see console). Make sure images are in /public and same-origin.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container p-6">
      <div className="flex items-center gap-4">
        <img src="/logo.png" alt="Logo" style={{height:56}} />
        <div>
          <h1 className="text-3xl font-bold">DOLLC Contractor Pay Stub Generator</h1>
          <p className="small">Relationship built on duty and trust</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-2">
        <Card>
          <CardHeader><CardTitle>Contractor</CardTitle></CardHeader>
          <CardContent>
            <Label>Name</Label>
            <Input value={contractor.name} onChange={(e) => setContractor({ ...contractor, name: e.target.value })} />
            <Label className="mt-2">Email</Label>
            <Input value={contractor.email} onChange={(e) => setContractor({ ...contractor, email: e.target.value })} />
            <Label className="mt-2">ID</Label>
            <Input value={contractor.id} onChange={(e) => setContractor({ ...contractor, id: e.target.value })} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pay Period</CardTitle></CardHeader>
          <CardContent>
            <Label>Start</Label>
            <Input type="date" value={period.start} onChange={(e) => setPeriod({ ...period, start: e.target.value })} />
            <Label className="mt-2">End</Label>
            <Input type="date" value={period.end} onChange={(e) => setPeriod({ ...period, end: e.target.value })} />
            <Label className="mt-2">Pay Date</Label>
            <Input type="date" value={period.payDate} onChange={(e) => setPeriod({ ...period, payDate: e.target.value })} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Payment Method</CardTitle></CardHeader>
          <CardContent>
            <select value={paidVia} onChange={(e) => setPaidVia(e.target.value)} style={{width:"100%", padding:8, borderRadius:6}}>
              <option value="">Select</option>
              <option>Check</option>
              <option>Venmo</option>
              <option>Zelle</option>
              <option>Lemfi</option>
            </select>
            <p className="small mt-2">Mileage is only applicable to <strong>Photo Capture</strong> at ${MILE_RATE.toFixed(2)}/mi.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-2">
        <CardHeader className="flex justify-between items-center">
          <CardTitle>Earnings</CardTitle>
          <Button onClick={addItem}><Plus /> Add</Button>
        </CardHeader>
        <CardContent>
          {items.length === 0 && <p className="small">No items yet.</p>}
          {items.map((x) => (
            <div key={x.id} style={{display:"grid", gridTemplateColumns:"repeat(12,1fr)", gap:8, marginBottom:8, borderBottom:"1px solid #eef2f7", paddingBottom:8}}>
              <div style={{gridColumn:"span 4"}}>
                <select value={x.category} onChange={(e) => setItems(items.map((i) => (i.id === x.id ? { ...i, category: e.target.value } : i)))}>
                  {categories.map((c) => (<option key={c}>{c}</option>))}
                </select>
                <Input placeholder="Add note..." value={x.note} onChange={(e) => setItems(items.map((i) => (i.id === x.id ? { ...i, note: e.target.value } : i)))} className="mt-2" />
              </div>

              <Input type="number" placeholder="Qty" value={x.qty} onChange={(e) => setItems(items.map((i) => (i.id === x.id ? { ...i, qty: e.target.value } : i)))} style={{gridColumn:"span 2"}} />
              <Input type="number" placeholder="Rate" value={x.rate} onChange={(e) => setItems(items.map((i) => (i.id === x.id ? { ...i, rate: e.target.value } : i)))} style={{gridColumn:"span 2"}} />
              <div style={{gridColumn:"span 1"}}><button onClick={() => removeItem(x.id)}>Delete</button></div>

              {x.category === "Photo Capture" && (
                <div style={{gridColumn:"1 / -1", marginTop:6, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                  <div className="small">Mileage (at ${MILE_RATE.toFixed(2)}/mi)</div>
                  <Input type="number" placeholder="Miles" value={x.miles} onChange={(e) => setItems(items.map((i) => (i.id === x.id ? { ...i, miles: e.target.value } : i)))} style={{width:120}} />
                  <div className="text-right small">${((Number(x.miles || 0)) * MILE_RATE).toFixed(2)}</div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div ref={printableRef} className="card rounded-xl mt-2">
        <div className="flex justify-between items-center">
          <img src="/logo.png" alt="logo" style={{height:48}} />
          <div className="text-right small">
            <div>Pay Period: {period.start} - {period.end}</div>
            <div>Pay Date: {period.payDate}</div>
            <div>Paid via: {paidVia || "—"}</div>
          </div>
        </div>

                {/* Office Address Above Pay Stub */}
        <div className="small mt-2" style={{ marginBottom: 6, lineHeight: "1.3", fontWeight: "700", fontSize: "18px" }}>
        adjuster@dollcappraisals.com<br/>
        (502) 422-1901<br/>
        P O Box 112, Bloomfield, KY 40008-0112
        </div>

        <h2 className="text-xl font-bold mt-2">Pay Stub for {contractor.name || "—"}</h2>
        <table style={{width:"100%", marginTop:8, fontSize:13}}>
          <thead style={{borderBottom:"1px solid #eef2f7", color:"#475569"}}>
            <tr>
              <th style={{textAlign:"left"}}>Category</th>
              <th style={{textAlign:"left"}}>Notes</th>
              <th style={{textAlign:"right"}}>Qty</th>
              <th style={{textAlign:"right"}}>Rate</th>
              <th style={{textAlign:"right"}}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((x) => (
              <React.Fragment key={x.id}>
                <tr style={{borderBottom:"1px solid #f1f5f9"}}>
                  <td>{x.category}</td>
                  <td>{x.note || "—"}</td>
                  <td style={{textAlign:"right"}}>{Number(x.qty || 0)}</td>
                  <td style={{textAlign:"right"}}>${Number(x.rate || 0).toFixed(2)}</td>
                  <td style={{textAlign:"right", fontWeight:600}}>${(Number(x.qty || 0) * Number(x.rate || 0)).toFixed(2)}</td>
                </tr>
                {x.category === "Photo Capture" && Number(x.miles || 0) > 0 && (
                  <tr style={{borderBottom:"1px solid #f1f5f9"}}>
                    <td style={{paddingLeft:20}}>Mileage (Photo Capture)</td>
                    <td></td>
                    <td style={{textAlign:"right"}}>{Number(x.miles || 0)}</td>
                    <td style={{textAlign:"right"}}>${MILE_RATE.toFixed(2)}/mi</td>
                    <td style={{textAlign:"right", fontWeight:600}}>${(Number(x.miles || 0) * MILE_RATE).toFixed(2)}</td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        <div style={{textAlign:"right", marginTop:12}}>
          <div>Gross Earnings: <strong>${totals.earnings.toFixed(2)}</strong></div>
          <div>+ Mileage: <strong>${totals.mileage.toFixed(2)}</strong></div>
          <div style={{fontSize:18, fontWeight:700}}>Net Pay: ${totals.total.toFixed(2)}</div>
        </div>
      </div>

      <div style={{marginTop:12}}>
        <Button onClick={exportPDF}>
          {busy ? "Exporting..." : "Export PDF"}
        </Button>
      </div>
    </div>
  );
}
