import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Library, Folder } from "lucide-react";
import ContentWorkspace from "@/components/content/ContentWorkspace";
import ContentLibrary from "@/components/content/ContentLibrary";

export default function Content() {
    const [selectedClientId, setSelectedClientId] = useState(null);
    const [activeTab, setActiveTab] = useState("workspace");
    const queryClient = useQueryClient();

    const { data: clients = [] } = useQuery({
        queryKey: ['clients'],
        queryFn: () => base44.entities.Client.list("-name", 100),
    });

    const selectedClient = clients.find(c => c.id === selectedClientId);

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Content Studio</h1>
                <p className="text-slate-500 text-sm mt-1">Analyze, generate, and rewrite content using the 12-dimension entropy framework.</p>
            </div>

            {/* Client Selector */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Select Client</label>
                <Select value={selectedClientId || ""} onValueChange={setSelectedClientId}>
                    <SelectTrigger className="w-full max-w-sm">
                        <SelectValue placeholder="Choose a client..." />
                    </SelectTrigger>
                    <SelectContent>
                        {clients.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Client Content Folders */}
            {!selectedClient && (
                <div>
                    <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <Folder className="w-4 h-4" /> Client Content Folders
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {clients.sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                            <button
                                key={c.id}
                                onClick={() => { setSelectedClientId(c.id); setActiveTab("library"); }}
                                className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 text-left hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
                            >
                                <div className="w-8 h-8 rounded-lg bg-indigo-100 group-hover:bg-indigo-200 flex items-center justify-center flex-shrink-0 transition-colors">
                                    <Library className="w-4 h-4 text-indigo-600" />
                                </div>
                                <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-700 truncate">{c.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {selectedClient && (
                <>
                    {/* Tabs */}
                    <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
                        <button
                            onClick={() => setActiveTab("workspace")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "workspace" ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            <FileText className="w-4 h-4" /> Workspace
                        </button>
                        <button
                            onClick={() => setActiveTab("library")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === "library" ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            <Library className="w-4 h-4" /> {selectedClient.name}'s Library
                        </button>
                    </div>

                    {/* Content */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                        {activeTab === "workspace" ? (
                            <ContentWorkspace
                                client={selectedClient}
                                onSaved={() => queryClient.invalidateQueries({ queryKey: ['contentItems', selectedClientId] })}
                            />
                        ) : (
                            <ContentLibrary clientId={selectedClientId} client={selectedClient} />
                        )}
                    </div>
                </>
            )}
        </div>
    );
}