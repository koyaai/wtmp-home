import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Globe, ChevronLeft, Loader2, Trash2, CheckCircle2, XCircle, Download } from "lucide-react";
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
  const [retryingId, setRetryingId] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, currentPage: '', failed: [] });
  const [saving, setSaving] = useState({ active: false, current: 0, total: 0 });
  const [wpPublishing, setWpPublishing] = useState({ active: false, current: 0, total: 0 });

  useEffect(() => {
    base44.entities.Client.list('-name', 100).then(setClients).catch(() => {});
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const p = await base44.entities.WebsiteProject.list('-created_date', 50);
    setProjects(p);
  };

  const buildPageList = (q) => {
    const pages = [
      { key: 'home', name: 'Home Page' },
      { key: 'about', name: 'About Us Page' },
      { key: 'products', name: 'Products Overview Page' },
      { key: 'services', name: 'Services Overview Page' },
      { key: 'service_areas', name: 'Service Areas Page' },
      { key: 'gallery', name: 'Gallery & Projects Page' },
    ];
    if (q.new_construction) pages.push({ key: 'new_construction', name: 'New Home Construction Page' });
    if (q.motorization) pages.push({ key: 'motorization', name: 'Motorized Window Treatments Page' });
    if (q.wood_blinds || q.faux_wood_blinds || q.vertical_blinds) {
      pages.push({ key: 'blinds', name: 'Blinds Overview Page' });
      if (q.wood_blinds) pages.push({ key: 'wood_blinds', name: 'Wood Blinds Page' });
      if (q.faux_wood_blinds) pages.push({ key: 'faux_wood_blinds', name: 'Faux Wood Blinds Page' });
      if (q.vertical_blinds) pages.push({ key: 'vertical_blinds', name: 'Vertical Blinds Page' });
    }
    if (q.roller_shades || q.roman_shades || q.woven_wood_shades || q.honeycomb_shades) {
      pages.push({ key: 'shades', name: 'Shades Overview Page' });
      if (q.roller_shades) pages.push({ key: 'roller_shades', name: 'Roller Shades Page' });
      if (q.roman_shades) pages.push({ key: 'roman_shades', name: 'Roman Shades Page' });
      if (q.woven_wood_shades) pages.push({ key: 'woven_wood_shades', name: 'Woven Wood Shades Page' });
      if (q.honeycomb_shades) pages.push({ key: 'honeycomb_shades', name: 'Honeycomb/Cellular Shades Page' });
    }
    if (q.plantation_shutters || q.wood_shutters || q.composite_shutters || q.vinyl_shutters) {
      pages.push({ key: 'shutters', name: 'Shutters Overview Page' });
      if (q.plantation_shutters) pages.push({ key: 'plantation_shutters', name: 'Plantation Shutters Page' });
      if (q.wood_shutters) pages.push({ key: 'wood_shutters', name: 'Wood Shutters Page' });
      if (q.composite_shutters) pages.push({ key: 'composite_shutters', name: 'Composite Shutters Page' });
      if (q.vinyl_shutters) pages.push({ key: 'vinyl_shutters', name: 'Vinyl Shutters Page' });
    }
    if (q.draperies) pages.push({ key: 'draperies', name: 'Custom Draperies Page' });
    return pages;
  };

  const handleGenerate = async (questionnaire, existingProjectId = null) => {
    setGenerating(true);
    if (existingProjectId) setRetryingId(existingProjectId);

    const selectedClient = clients.find(c => c.id === selectedClientId);
    let project;
    let existingPages = [];

    if (existingProjectId) {
      await base44.entities.WebsiteProject.update(existingProjectId, { status: 'generating', error_message: null });
      const found = projects.find(p => p.id === existingProjectId);
      project = found;
      existingPages = found?.generated_pages || [];
    } else {
      project = await base44.entities.WebsiteProject.create({
        client_id: selectedClientId || null,
        client_name: selectedClient?.name || questionnaire.business_name,
        project_name: `${questionnaire.business_name} Website Copy`,
        questionnaire,
        generated_pages: [],
        pages_count: 0,
        status: 'generating',
      });
    }

    const q = questionnaire || project.questionnaire;
    const allPages = buildPageList(q);
    // Skip pages already successfully generated
    const existingKeys = new Set(existingPages.map(p => p.page_key));
    const pagesToGenerate = allPages.filter(p => !existingKeys.has(p.key));

    setProgress({ current: 0, total: pagesToGenerate.length, currentPage: '', failed: [] });

    const accumulated = [...existingPages];
    const failed = [];

    for (let i = 0; i < pagesToGenerate.length; i++) {
      const pg = pagesToGenerate[i];
      setProgress(prev => ({ ...prev, current: i, currentPage: pg.name }));
      try {
        const response = await base44.functions.invoke('generateSinglePage', {
          questionnaire: q,
          page_key: pg.key,
          page_name: pg.name,
        });
        const page = response.data?.page;
        if (!page) throw new Error('Empty response');
        accumulated.push(page);
        // Save progress after each page
        await base44.entities.WebsiteProject.update(project.id, {
          generated_pages: accumulated,
          pages_count: accumulated.length,
        });
      } catch (err) {
        failed.push({ ...pg, error: err.message });
      }
      setProgress(prev => ({ ...prev, current: i + 1, failed }));
    }

    const finalStatus = failed.length === pagesToGenerate.length ? 'error' : failed.length > 0 ? 'partial' : 'complete';
    const errorMsg = failed.length > 0 ? `Failed pages: ${failed.map(f => f.name).join(', ')}` : null;

    await base44.entities.WebsiteProject.update(project.id, {
      status: finalStatus,
      error_message: errorMsg,
    });

    const fullProject = { ...project, generated_pages: accumulated, pages_count: accumulated.length, status: finalStatus, error_message: errorMsg, questionnaire: q };
    setSelectedProject(fullProject);
    setView('results');

    if (failed.length === 0) toast.success(`Generated all ${accumulated.length} pages!`);
    else toast.error(`${failed.length} page(s) failed — click Retry to complete them.`);

    setGenerating(false);
    setRetryingId(null);
    setProgress({ current: 0, total: 0, currentPage: '', failed: [] });
    loadProjects();
  };

  const handleDeleteProject = async (id) => {
    if (!confirm('Delete this project and all its pages?')) return;
    await base44.entities.WebsiteProject.delete(id);
    toast.success('Project deleted');
    loadProjects();
    if (selectedProject?.id === id) { setSelectedProject(null); setView('list'); }
  };

  const savePageToLibrary = async (page) => {
    const contentTypeMap = {
      home: 'Landing Page', about: 'Other', products: 'Service Page',
      services: 'Service Page', service_areas: 'Service Page', gallery: 'Other',
    };
    await base44.entities.ContentItem.create({
      client_id: selectedProject?.client_id || null,
      client_name: selectedProject?.client_name || '',
      title: page.h1 || page.page_name,
      final_content: `Meta Description: ${page.meta_description}\n\n${page.content}`,
      content_type: contentTypeMap[page.page_key] || 'Service Page',
      mode: 'generated',
      status: 'draft',
      context_notes: `Website page: ${page.page_name}`,
    });
  };

  const handleSavePageToLibrary = async (page) => {
    await savePageToLibrary(page);
    toast.success('Saved to Content Library');
  };

  const handleSaveAllToLibrary = async () => {
    const pages = selectedProject?.generated_pages || [];
    if (pages.length === 0) return;
    setSaving({ active: true, current: 0, total: pages.length });
    try {
      for (let i = 0; i < pages.length; i++) {
        await savePageToLibrary(pages[i]);
        setSaving({ active: true, current: i + 1, total: pages.length });
      }
      toast.success(`Saved all ${pages.length} pages to Content Library`);
    } catch (err) {
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving({ active: false, current: 0, total: 0 });
    }
  };

  const handleDownloadAll = () => {
    const pages = selectedProject?.generated_pages || [];
    if (pages.length === 0) return;
    const text = pages.map(page => [
      `${'='.repeat(60)}`,
      `PAGE: ${page.page_name}`,
      `${'='.repeat(60)}`,
      `H1: ${page.h1 || ''}`,
      `META DESCRIPTION: ${page.meta_description || ''}`,
      ``,
      `CONTENT:`,
      page.content || '',
      ``,
    ].join('\n')).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedProject.project_name.replace(/[^a-z0-9]/gi, '_')}_pages.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${pages.length} pages`);
  };

  const handlePublishAllToWP = async () => {
    const pages = selectedProject?.generated_pages || [];
    const client = clients.find(c => c.id === selectedProject?.client_id);
    if (!client?.wordpress_url) { toast.error('This client has no WordPress configured'); return; }
    if (!confirm(`Publish all ${pages.length} pages to WordPress as Pages on ${client.wordpress_url}?`)) return;
    setWpPublishing({ active: true, current: 0, total: pages.length });
    let failed = 0;
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      try {
        const res = await base44.functions.invoke('wpPublish', {
          client_id: client.id,
          title: page.h1 || page.page_name,
          content: page.content,
          status: 'draft',
          post_type: 'page',
        });
        if (res.data?.error) failed++;
      } catch { failed++; }
      setWpPublishing({ active: true, current: i + 1, total: pages.length });
    }
    setWpPublishing({ active: false, current: 0, total: 0 });
    if (failed === 0) toast.success(`All ${pages.length} pages sent to WordPress as drafts!`);
    else toast.error(`${failed} page(s) failed to publish.`);
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
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              {clients.find(c => c.id === selectedProject?.client_id)?.wordpress_url && (
                <Button onClick={handlePublishAllToWP} variant="outline" className="gap-2 border-blue-300 text-blue-600 hover:bg-blue-50" disabled={wpPublishing.active}>
                  {wpPublishing.active ? <><Loader2 className="w-4 h-4 animate-spin" /> Publishing {wpPublishing.current}/{wpPublishing.total}...</> : <><Globe className="w-4 h-4" /> Publish All to WP</>}
                </Button>
              )}
              <Button onClick={handleDownloadAll} variant="outline" className="gap-2">
                <Download className="w-4 h-4" /> Download All
              </Button>
              <Button onClick={handleSaveAllToLibrary} variant="outline" className="gap-2" disabled={saving.active}>
                {saving.active ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving {saving.current}/{saving.total}...</> : 'Save All to Library'}
              </Button>
            </div>
            {(saving.active || wpPublishing.active) && (
              <div className="w-48">
                <Progress value={saving.active ? (saving.current / saving.total) * 100 : (wpPublishing.current / wpPublishing.total) * 100} className="h-1.5" />
              </div>
            )}
          </div>
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
                  className={`border rounded-xl p-4 bg-white transition-colors ${
                    p.status === 'error' ? 'border-red-200' :
                    p.status === 'generating' ? 'border-yellow-200' :
                    'border-slate-200 hover:border-blue-300 cursor-pointer'
                  }`}
                  onClick={() => p.status === 'complete' && (setSelectedProject(p), setView('results'))}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 text-sm">{p.project_name}</h3>
                        <Badge className={
                          p.status === 'complete' ? 'bg-green-100 text-green-700' :
                          p.status === 'error' ? 'bg-red-100 text-red-700' :
                          p.status === 'partial' ? 'bg-orange-100 text-orange-700' :
                          'bg-yellow-100 text-yellow-700'
                        }>
                          {p.status}
                        </Badge>
                      </div>
                      {p.client_name && <p className="text-xs text-slate-500">Client: {p.client_name}</p>}
                      <p className="text-xs text-slate-400 mt-1">
                        {p.pages_count || 0} pages generated
                        {p.created_date ? ` · ${format(new Date(p.created_date), 'MMM d, yyyy')}` : ''}
                      </p>
                      {p.error_message && <p className="text-xs text-red-500 mt-1">{p.error_message}</p>}
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      {(p.status === 'error' || p.status === 'generating' || p.status === 'partial') && (
                        <Button size="sm" variant="outline" className="text-xs h-7"
                          disabled={retryingId === p.id}
                          onClick={e => { e.stopPropagation(); if (!p.questionnaire) { toast.error('No questionnaire data saved for this project.'); return; } setView('new'); handleGenerate(p.questionnaire, p.id); }}>
                          {retryingId === p.id ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</> : 'Retry'}
                        </Button>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteProject(p.id); }}
                        className="text-slate-300 hover:text-red-500 p-1 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
            <div className="py-16 bg-white border border-slate-200 rounded-xl px-8">
              <div className="max-w-md mx-auto">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                  <h3 className="text-lg font-semibold text-slate-800">Generating website copy...</h3>
                </div>
                {progress.total > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-slate-500 mb-2">
                      <span>{progress.currentPage}</span>
                      <span>{progress.current} / {progress.total}</span>
                    </div>
                    <Progress value={(progress.current / progress.total) * 100} className="mb-4" />
                    {progress.failed.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {progress.failed.map(f => (
                          <div key={f.key} className="flex items-center gap-2 text-xs text-red-500">
                            <XCircle className="w-3 h-3" /> {f.name} failed
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
                <p className="text-xs text-slate-400 text-center mt-4">Each page is saved as it's generated. Don't close this window.</p>
              </div>
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
                  client={clients.find(c => c.id === selectedProject?.client_id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}