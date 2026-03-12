import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Globe, ChevronLeft, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import WebsiteQuestionnaire from "@/components/websitecontent/WebsiteQuestionnaire";
import GeneratedPageCard from "@/components/websitecontent/GeneratedPageCard";

export default function WebsiteContentCreator() {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [view, setView] = useState('list'); // 'list' | 'new' | 'results'
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    base44.entities.Client.list('-name', 100).then(setClients).catch(() => {});
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const p = await base44.entities.WebsiteProject.list('-created_date', 50);
    setProjects(p);
  };

  const handleGenerate = async (questionnaire) => {
    setGenerating(true);
    const selectedClient = clients.find(c => c.id === selectedClientId);
    const project = await base44.entities.WebsiteProject.create({
      client_id: selectedClientId || null,
      client_name: selectedClient?.name || questionnaire.business_name,
      project_name: `${questionnaire.business_name} Website Copy`,
      questionnaire,
      status: 'generating',
    });

    const response = await base44.functions.invoke('generateWebsiteContent', { questionnaire });
    const pages = response.data?.pages || [];

    await base44.entities.WebsiteProject.update(project.id, {
      generated_pages: pages,
      pages_count: pages.length,
      status: 'complete',
    });

    const fullProject = { ...project, generated_pages: pages, pages_count: pages.length, status: 'complete' };
    setSelectedProject(fullProject);
    setView('results');
    setGenerating(false);
    toast.success(`Generated ${pages.length} pages!`);
    loadProjects();
  };

  const handleDeleteProject = async (id) => {
    if (!confirm('Delete this project and all its pages?')) return;
    await base44.entities.WebsiteProject.delete(id);
    toast.success('Project deleted');
    loadProjects();
    if (selectedProject?.id === id) { setSelectedProject(null); setView('list'); }
  };

  const handleSavePageToLibrary = async (page) => {
    const contentTypeMap = {
      home: 'Landing Page', about: 'Other', products: 'Service Page',
      services: 'Service Page', service_areas: 'Service Page', gallery: 'Other',
    };
    await base44.entities.ContentItem.create({
      client_id: selectedProject?.client_id || '',
      client_name: selectedProject?.client_name || '',
      title: page.h1,
      final_content: `Meta Description: ${page.meta_description}\n\n${page.content}`,
      content_type: contentTypeMap[page.page_key] || 'Service Page',
      mode: 'generated',
      status: 'draft',
      context_notes: `Website page: ${page.page_name}`,
    });
    toast.success('Saved to Content Library');
  };

  const handleSaveAllToLibrary = async () => {
    const pages = selectedProject?.generated_pages || [];
    for (const page of pages) {
      await handleSavePageToLibrary(page);
    }
    toast.success(`Saved all ${pages.length} pages to Content Library`);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          {view !== 'list' && (
            <button onClick={() => { setView('list'); setSelectedProject(null); }}
              className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-1.5 transition-colors">
              <ChevronLeft className="w-3 h-3" /> Back to Projects
            </button>
          )}
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-600" />
            Web Copy Builder
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">One-click generation of all website pages from a single questionnaire</p>
        </div>
        {view === 'list' && (
          <Button onClick={() => setView('new')} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" /> New Project
          </Button>
        )}
        {view === 'results' && (
          <Button onClick={handleSaveAllToLibrary} variant="outline" className="gap-2">
            Save All to Library
          </Button>
        )}
      </div>

      {/* LIST VIEW */}
      {view === 'list' && (
        <div>
          {projects.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl bg-white">
              <Globe className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">No website projects yet</p>
              <p className="text-slate-400 text-sm mt-1">Fill in one questionnaire to generate all website pages at once</p>
              <Button onClick={() => setView('new')} className="mt-5 bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4" /> New Project
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {projects.map(p => (
                <div key={p.id}
                  className="border border-slate-200 rounded-xl p-4 bg-white hover:border-blue-300 transition-colors cursor-pointer"
                  onClick={() => { setSelectedProject(p); setView('results'); }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 text-sm">{p.project_name}</h3>
                        <Badge className={p.status === 'complete' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                          {p.status}
                        </Badge>
                      </div>
                      {p.client_name && <p className="text-xs text-slate-500">Client: {p.client_name}</p>}
                      <p className="text-xs text-slate-400 mt-1">
                        {p.pages_count || 0} pages generated
                        {p.created_date ? ` · ${format(new Date(p.created_date), 'MMM d, yyyy')}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteProject(p.id); }}
                      className="text-slate-300 hover:text-red-500 p-1 ml-3 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* QUESTIONNAIRE / GENERATING */}
      {view === 'new' && (
        <div>
          {generating ? (
            <div className="text-center py-24 bg-white border border-slate-200 rounded-xl">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-5" />
              <h3 className="text-lg font-semibold text-slate-800">Generating your website copy...</h3>
              <p className="text-slate-500 mt-2 text-sm max-w-sm mx-auto">
                Using advanced AI to write all pages from your questionnaire. This takes 45–90 seconds.
              </p>
              <p className="text-xs text-slate-400 mt-3">Please don't close this window.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <WebsiteQuestionnaire
                clients={clients}
                selectedClientId={selectedClientId}
                onClientChange={setSelectedClientId}
                onSubmit={handleGenerate}
                onCancel={() => setView('list')}
              />
            </div>
          )}
        </div>
      )}

      {/* RESULTS VIEW */}
      {view === 'results' && selectedProject && (
        <div>
          <div className="mb-5">
            <h2 className="text-base font-semibold text-slate-900">{selectedProject.project_name}</h2>
            <p className="text-sm text-slate-500">
              {(selectedProject.generated_pages || []).length} pages generated
              {selectedProject.questionnaire?.city ? ` for ${selectedProject.questionnaire.city}` : ''}
            </p>
          </div>
          {(!selectedProject.generated_pages || selectedProject.generated_pages.length === 0) ? (
            <div className="text-center py-10 text-slate-400 text-sm">No pages found for this project.</div>
          ) : (
            <div className="grid gap-3">
              {selectedProject.generated_pages.map((page, i) => (
                <GeneratedPageCard
                  key={i}
                  page={page}
                  onSaveToLibrary={() => handleSavePageToLibrary(page)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}