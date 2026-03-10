import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Upload, Download, CheckCircle2, XCircle, Loader2, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const TEMPLATE_HEADERS = [
  "name", "contact_name", "contact_email", "contact_phone",
  "website", "location", "status", "retainer_fee", "start_date",
  "csm_assigned", "services", "notes"
];

const SAMPLE_ROW = [
  "Acme Flooring Co", "John Smith", "john@acmeflooring.com", "555-123-4567",
  "https://acmeflooring.com", "Dallas, TX", "active", "2500", "2024-01-15",
  "jane@agency.com", "SEO|PPC", "Top flooring client in DFW"
];

const VALID_STATUSES = ["active", "onboarding", "paused", "churned"];
const VALID_SERVICES = ["SEO", "PPC", "Social Media", "Web Design", "GHL Automations", "Customer Success"];

function parseCSV(text) {
  const lines = text.trim().split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row.");

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_").replace(/"/g, ""));

  return lines.slice(1).map((line, idx) => {
    // Handle quoted commas
    const values = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; }
      else if (char === "," && !inQuotes) { values.push(current.trim()); current = ""; }
      else { current += char; }
    }
    values.push(current.trim());

    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] || ""; });

    const errors = [];
    if (!row.name) errors.push("Name is required");

    const parsed = {
      name: row.name,
      contact_name: row.contact_name || undefined,
      contact_email: row.contact_email || undefined,
      contact_phone: row.contact_phone || undefined,
      website: row.website || undefined,
      location: row.location || undefined,
      status: VALID_STATUSES.includes(row.status) ? row.status : "active",
      retainer_fee: row.retainer_fee ? parseFloat(row.retainer_fee) : undefined,
      start_date: row.start_date || undefined,
      csm_assigned: row.csm_assigned || undefined,
      notes: row.notes || undefined,
      services: row.services
        ? row.services.split("|").map(s => s.trim()).filter(s => VALID_SERVICES.includes(s))
        : undefined,
    };

    return { rowIndex: idx + 2, data: parsed, errors };
  });
}

function downloadTemplate() {
  const csvContent = [TEMPLATE_HEADERS.join(","), SAMPLE_ROW.join(",")].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "clients_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function ClientBatchUpload({ onClose, onUploaded }) {
  const [rows, setRows] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseCSV(ev.target.result);
        setRows(parsed);
        setResults(null);
      } catch (err) {
        toast.error(err.message);
      }
    };
    reader.readAsText(file);
  };

  const validRows = rows.filter(r => r.errors.length === 0);
  const invalidRows = rows.filter(r => r.errors.length > 0);

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setUploading(true);
    let success = 0, failed = 0;
    for (const row of validRows) {
      try {
        await base44.entities.Client.create(row.data);
        success++;
      } catch { failed++; }
    }
    setUploading(false);
    setResults({ success, failed });
    if (success > 0) {
      toast.success(`${success} client(s) imported successfully!`);
      onUploaded?.();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Batch Import Clients</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Step 1: Download template */}
          <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-slate-700 text-sm">Step 1 — Download the CSV template</p>
              <p className="text-xs text-slate-400 mt-0.5">Fill it in with your client data. Use <code className="bg-slate-200 px-1 rounded">|</code> to separate multiple services (e.g. <code className="bg-slate-200 px-1 rounded">SEO|PPC</code>).</p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="flex-shrink-0">
              <Download className="w-4 h-4 mr-1.5" /> Template
            </Button>
          </div>

          {/* Step 2: Upload */}
          <div>
            <p className="font-medium text-slate-700 text-sm mb-2">Step 2 — Upload your CSV</p>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
              <Upload className="w-8 h-8 text-slate-300" />
              <span className="text-sm text-slate-500">Click to select a CSV file</span>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
            </label>
          </div>

          {/* Preview */}
          {rows.length > 0 && !results && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1 text-green-600 font-medium">
                  <CheckCircle2 className="w-4 h-4" /> {validRows.length} valid
                </span>
                {invalidRows.length > 0 && (
                  <span className="flex items-center gap-1 text-red-500 font-medium">
                    <XCircle className="w-4 h-4" /> {invalidRows.length} with errors
                  </span>
                )}
              </div>

              {/* Valid rows preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-52">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        {["Business Name", "Location", "Status", "Services", "Retainer"].map(h => (
                          <th key={h} className="text-left px-3 py-2 text-slate-500 font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {validRows.map((r, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">{r.data.name}</td>
                          <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{r.data.location || "—"}</td>
                          <td className="px-3 py-2 text-slate-500 capitalize whitespace-nowrap">{r.data.status}</td>
                          <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{r.data.services?.join(", ") || "—"}</td>
                          <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{r.data.retainer_fee ? `$${r.data.retainer_fee.toLocaleString()}` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Errors */}
              {invalidRows.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Rows with errors (will be skipped):</p>
                  {invalidRows.map(r => (
                    <p key={r.rowIndex} className="text-xs text-red-600">Row {r.rowIndex}: {r.errors.join(", ")}</p>
                  ))}
                </div>
              )}

              <Button onClick={handleImport} disabled={uploading || validRows.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white">
                {uploading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...</>
                  : <><Upload className="w-4 h-4 mr-2" /> Import {validRows.length} Client{validRows.length !== 1 ? "s" : ""}</>}
              </Button>
            </div>
          )}

          {/* Done state */}
          {results && (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
              <p className="font-semibold text-slate-800">{results.success} client{results.success !== 1 ? "s" : ""} imported!</p>
              {results.failed > 0 && <p className="text-sm text-red-500">{results.failed} failed to import.</p>}
              <Button onClick={onClose} className="mt-2 bg-slate-800 hover:bg-slate-700 text-white">Done</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}