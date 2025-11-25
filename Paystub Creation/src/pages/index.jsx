import React, { useState, useMemo, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Plus, Trash2, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MILE_RATE = 0.2;

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return (Date.now() + Math.random()).toString(36);
}

export default function PayStubApp() {
  const printableRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [contractor, setContractor] = useState({ name: "", email: "", id: "" });
  const [period, setPeriod] = useState({ start: "", end: "", payDate: "" });
  const [paidVia, setPaidVia] = useState("");
  const [items, setItems] = useState([]);

  const categories = [
    "Photo Capture",
    "Estimate Writing",
    "NADA Research",
    "Salvage Bid",
    "CCC Profile",
    "Photo Renaming",
    "Bookkeeping",
    "Office Administration",
    "Others",
  ];

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { id: generateId(), category: categories[0], qty: 1, rate: 0, miles: 0, date: "", note: "" },
    ]);

  const removeItem = (id) => setItems((prev) => prev.filter((x) => x.id !== id));

  const totals = useMemo(() => {
    const earnings = items.reduce((sum, x) => sum + Number(x.qty || 0) * Number(x.rate || 0), 0);
    const mileage = items.reduce(
      (sum, x) => sum + (x.category === "Photo Capture" ? Number(x.miles || 0) * MILE_RATE : 0),
      0
    );
    return { earnings, mileage, total: earnings + mileage };
  }, [items]);

  const exportPDF = async () => {
    if (busy) return;
    const node = printableRef.current;
    if (!node) {
      alert("Preview not ready yet — make sure the page has rendered.");
      return;
    }

    setBusy(true);
    const MARKER = "data-html2canvas-root";
    node.setAttribute(MARKER, "true");

    try {
      const canvas = await html2canvas(node, {
        scale: 1.9,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc) => {
          try {
            const clonedRoot = clonedDoc.querySelector(`[${MARKER}]`);
            if (!clonedRoot) return;

            function copyComputedStyles(origEl, cloneEl) {
              if (!origEl || !cloneEl) return;
              const cs = window.getComputedStyle(origEl);
              // inline the computed color/background styles to avoid parsing issues (e.g. oklch)
              cloneEl.style.color = cs.color;
              cloneEl.style.backgroundColor = cs.backgroundColor;
              cloneEl.style.borderColor = cs.borderColor;
              cloneEl.style.boxShadow = cs.boxShadow;
              cloneEl.style.backgroundImage = cs.backgroundImage;
              cloneEl.style.outlineColor = cs.outlineColor;

              const oc = origEl.children || [];
              const cc = cloneEl.children || [];
              for (let i = 0; i < oc.length; i++) {
                if (cc[i]) copyComputedStyles(oc[i], cc[i]);
              }
            }

            copyComputedStyles(node, clonedRoot);
          } catch (e) {
            // don't let style-copying break the export
            // eslint-disable-next-line no-console
            console.warn("onclone style inlining failed", e);
          }
        },
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "pt", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // simple pagination: slice and add pages if tall
      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      } else {
        // split canvas into page-height slices
        const scale = imgWidth / canvas.width;
        const sliceHeightPx = Math.floor(pageHeight / scale) || canvas.height;
        let y = 0;
        while (y < canvas.height) {
          const slice = document.createElement("canvas");
          const sliceH = Math.min(sliceHeightPx, canvas.height - y);
          slice.width = canvas.width;
          slice.height = sliceH;
          slice.getContext("2d").drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
          const pageData = slice.toDataURL("image/png");
          if (y > 0) pdf.addPage();
          const pageImgHeight = (sliceH * imgWidth) / canvas.width;
          pdf.addImage(pageData, "PNG", 0, 0, imgWidth, pageImgHeight);
          y += sliceH;
        }
      }

      const safeName = (contractor.name || "contractor").replace(/\s+/g, "_").replace(/[^\w.-]/g, "");
      const safeDate = period.end || period.payDate || "pay";
      pdf.save(`${safeName}_stub_${safeDate}.pdf`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Export PDF failed:", err);
      alert("Failed to export PDF — check console for details. If images are remote, ensure they are same-origin or in /public.");
    } finally {
      try {
        node.removeAttribute(MARKER);
      } catch (e) {}
      setBusy(false);
    }
  };

  // small helper to update numeric fields as numbers
  const updateItem = (id, patch) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  return (
    <div className="container p-6">
      <div className="flex items-center gap-4">
        <img src="/logo.png" alt="Logo" style={{ height: 56 }} />
        <div>
          <h1 className="text-3xl font-bold">DOLLC Contractor Pay Stub Generator</h1>
          <p className="small">Relationship built on duty and trust</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-2">
        <Card>
          <CardHeader>
            <CardTitle>Contractor</CardTitle>
          </CardHeader>
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
          <CardHeader>
            <CardTitle>Pay Period</CardTitle>
          </CardHeader>
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
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <select value={paidVia} onChange={(e) => setPaidVia(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 6 }}>
              <option value="">Select</option>
              <option value="Check">Check</option>
              <option value="Venmo">Venmo</option>
              <option value="Zelle">Zelle</option>
              <option value="Lemfi">Lemfi</option>
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
            <div key={x.id} style={{ display: "grid", gridTemplateColumns: "repeat(12,1fr)", gap: 8, marginBottom: 8, borderBottom: "1px solid #eef2f7", paddingBottom: 8 }}>
              <div style={{ gridColumn: "span 4" }}>
                <select
                  value={x.category}
                  onChange={(e) => updateItem(x.id, { category: e.target.value })}
                  style={{ width: "100%", padding: 8, borderRadius: 6 }}
                >
                  {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>

                <Input type="date" className="mt-2" value={x.date} onChange={(e) => updateItem(x.id, { date: e.target.value })} />
              </div>

              <Input placeholder="Add note..." value={x.note} onChange={(e) => updateItem(x.id, { note: e.target.value })} style={{ gridColumn: "span 3" }} />

              <Input
                type="number"
                placeholder="Qty"
                value={x.qty}
                onChange={(e) => updateItem(x.id, { qty: e.target.value === "" ? "" : Number(e.target.value) })}
                style={{ gridColumn: "span 2" }}
              />

              <Input
                type="number"
                placeholder="Rate"
                value={x.rate}
                onChange={(e) => updateItem(x.id, { rate: e.target.value === "" ? "" : Number(e.target.value) })}
                style={{ gridColumn: "span 2" }}
              />

              <div style={{ gridColumn: "span 1", display: "flex", alignItems: "center" }}>
                <button onClick={() => removeItem(x.id)}><Trash2 /></button>
              </div>

              {x.category === "Photo Capture" && (
                <div style={{ gridColumn: "1 / -1", marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div className="small">Mileage (at ${MILE_RATE.toFixed(2)}/mi)</div>
                  <Input
                    type="number"
                    placeholder="Miles"
                    value={x.miles}
                    onChange={(e) => updateItem(x.id, { miles: e.target.value === "" ? "" : Number(e.target.value) })}
                    style={{ width: 120 }}
                  />
                  <div className="text-right small">${(Number(x.miles || 0) * MILE_RATE).toFixed(2)}</div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div ref={printableRef} className="card rounded-xl mt-2" style={{ background: "#fff", padding: 16 }}>
        <div className="flex justify-between items-center">
          <img src="/logo.png" alt="logo" style={{ height: 48 }} />
          <div className="text-right small">
            <div>Pay Period: {period.start} - {period.end}</div>
            <div>Pay Date: {period.payDate}</div>
            <div>Paid via: {paidVia || "—"}</div>
          </div>
        </div>

        <div className="small mt-2" style={{ marginBottom: 6, lineHeight: "1.3", fontWeight: 700, fontSize: 17 }}>
          adjuster@dollcappraisals.com<br /> (502) 422-1901<br /> P O Box 112, Bloomfield, KY 40008-0112
        </div>

        <h2 className="text-xl font-bold mt-2">Pay Stub for {contractor.name || "—"}</h2>

        <table style={{ width: "100%", marginTop: 8, fontSize: 13 }}>
          <thead style={{ borderBottom: "1px solid #eef2f7", color: "#475569" }}>
            <tr>
              <th style={{ textAlign: "left" }}>Category</th>
              <th style={{ textAlign: "left" }}>Date</th>
              <th style={{ textAlign: "left" }}>Notes</th>
              <th style={{ textAlign: "right" }}>Qty</th>
              <th style={{ textAlign: "right" }}>Rate</th>
              <th style={{ textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((x) => (
              <React.Fragment key={x.id}>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td>{x.category}</td>
                  <td>{x.date || "—"}</td>
                  <td>{x.note || "—"}</td>
                  <td style={{ textAlign: "right" }}>{Number(x.qty || 0)}</td>
                  <td style={{ textAlign: "right" }}>${Number(x.rate || 0).toFixed(2)}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>${(Number(x.qty || 0) * Number(x.rate || 0)).toFixed(2)}</td>
                </tr>

                {x.category === "Photo Capture" && Number(x.miles || 0) > 0 && (
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ paddingLeft: 20 }}>Mileage (Photo Capture)</td>
                    <td />
                    <td style={{ textAlign: "right" }}>{Number(x.miles || 0)}</td>
                    <td style={{ textAlign: "right" }}>${MILE_RATE.toFixed(2)}/mi</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>${(Number(x.miles || 0) * MILE_RATE).toFixed(2)}</td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        <div style={{ textAlign: "right", marginTop: 12 }}>
          <div>Gross Earnings: <strong>${totals.earnings.toFixed(2)}</strong></div>
          <div>+ Mileage: <strong>${totals.mileage.toFixed(2)}</strong></div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Net Pay: ${totals.total.toFixed(2)}</div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <Button onClick={exportPDF} disabled={busy || items.length === 0}>
          {busy ? <><Loader2 className="animate-spin" /> Exporting...</> : <><Download className="mr-2" /> Export PDF</>}
        </Button>
      </div>
    </div>
  );
}
