import { useState, useRef, useEffect } from 'react';
import { Card, Button, Badge, Skeleton, Tabs } from '../components/primitives';
import { useToast } from '../components/primitives';
import { resumeService } from '../services/data.service';
import { resumeBuilderService } from '../services/onboarding.service';
import type { ResumeAnalysis, GeneratedResume } from '../types';
import { clsx } from 'clsx';

export function ResumePage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-mono font-bold text-nothing-white tracking-tight">RESUME</h1>
        <p className="text-[11px] font-mono text-nothing-grey-500 mt-1 tracking-wide">Generate or analyze your developer resume</p>
      </div>

      <Tabs
        items={[
          { id: 'builder', label: 'Resume Builder', content: <ResumeBuilder /> },
          { id: 'analyzer', label: 'Resume Analyzer', content: <ResumeAnalyzer /> },
        ]}
        defaultTab="builder"
      />
    </div>
  );
}

// ============================================================
// Resume Builder
// ============================================================

function ResumeBuilder() {
  const { addToast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedResume | null>(null);
  const [history, setHistory] = useState<GeneratedResume[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sections, setSections] = useState<Record<string, boolean>>({
    header: true, bio: true, links: true, skills: true,
    education: true, projects: true, github: true, leetcode: true,
  });

  useEffect(() => {
    resumeBuilderService.getHistory().then(setHistory).catch(() => {}).finally(() => setLoadingHistory(false));
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await resumeBuilderService.generate(sections);
      setGenerated(result);
      setHistory((prev) => [result, ...prev]);
      addToast('Resume generated!', 'success');
    } catch { addToast('Failed to generate resume', 'error'); }
    setGenerating(false);
  };

  const toggleSection = (key: string) => setSections((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-1 space-y-4">
        <Card>
          <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-nothing-grey-400 mb-4">Sections</h3>
          <div className="space-y-2">
            {Object.entries(sections).map(([key, enabled]) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={enabled} onChange={() => toggleSection(key)} className="accent-nothing-red" />
                <span className={clsx('text-xs font-mono uppercase tracking-wider transition-colors', enabled ? 'text-nothing-grey-300' : 'text-nothing-grey-600')}>
                  {key}
                </span>
              </label>
            ))}
          </div>
          <Button variant="primary" className="w-full mt-5" onClick={handleGenerate} isLoading={generating}>
            Generate Resume
          </Button>
        </Card>

        <div className="space-y-2">
          <h4 className="text-[10px] font-mono uppercase tracking-[0.15em] text-nothing-grey-500">History</h4>
          {loadingHistory ? (
            <Card><Skeleton height="40px" /></Card>
          ) : history.length === 0 ? (
            <p className="text-[10px] font-mono text-nothing-grey-600">No generated resumes yet</p>
          ) : (
            history.slice(0, 5).map((r) => (
              <div key={r.id} onClick={() => setGenerated(r)} className="cursor-pointer">
                <Card
                  hoverable
                  padding="sm"
                  className={clsx(generated?.id === r.id && 'border-nothing-red')}
                >
                  <p className="text-xs font-mono text-nothing-grey-300">{r.template} template</p>
                  <p className="text-[10px] font-mono text-nothing-grey-600">{new Date(r.created_at).toLocaleString()}</p>
                </Card>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="lg:col-span-2">
        {generated?.markdown_content ? (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-nothing-grey-400">Preview</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { navigator.clipboard.writeText(generated.markdown_content); addToast('Copied to clipboard', 'success'); }}
              >
                Copy Markdown
              </Button>
            </div>
            <div className="prose prose-invert prose-sm max-w-none font-mono text-nothing-grey-300 text-sm whitespace-pre-wrap border border-nothing-grey-800 p-6 max-h-[600px] overflow-y-auto">
              {generated.markdown_content}
            </div>
          </Card>
        ) : (
          <Card className="flex items-center justify-center h-64">
            <p className="text-xs font-mono text-nothing-grey-500">Generate a resume to see the preview</p>
          </Card>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Resume Analyzer (original)
// ============================================================

function ResumeAnalyzer() {
  const [analyses, setAnalyses] = useState<ResumeAnalysis[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<ResumeAnalysis | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    resumeService.getAll().then(setAnalyses).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) { addToast('Please select a PDF file', 'warning'); return; }
    setUploading(true);
    try {
      const result = await resumeService.uploadAndAnalyze(selectedFile, targetRole || undefined);
      setAnalyses((prev) => [result, ...prev]);
      setSelectedAnalysis(result);
      setSelectedFile(null);
      setTargetRole('');
      if (fileRef.current) fileRef.current.value = '';
      addToast('Resume analyzed successfully!', 'success');
    } catch { addToast('Failed to analyze resume', 'error'); }
    finally { setUploading(false); }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = { completed: 'success', processing: 'info', failed: 'danger' };
    return (map[status] || 'warning') as any;
  };

  const getScoreColor = (score: number | string) => { const n = Number(score) || 0; return n >= 80 ? 'text-emerald-400' : n >= 60 ? 'text-amber-400' : 'text-nothing-red'; };

  return (
    <div className="space-y-6">

      <Card>
        <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-nothing-grey-400 mb-4">Upload</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <div
            className={clsx('flex-1 border-2 border-dashed p-8 text-center cursor-pointer transition-colors duration-300',
              selectedFile ? 'border-nothing-red/50 bg-nothing-red/5' : 'border-nothing-grey-700 hover:border-nothing-grey-500'
            )}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
            {selectedFile ? (
              <div>
                <p className="text-sm font-mono text-nothing-white">{selectedFile.name}</p>
                <p className="text-[10px] font-mono text-nothing-grey-500 mt-1">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-mono text-nothing-grey-400">Click to upload a PDF resume</p>
                <p className="text-[10px] font-mono text-nothing-grey-600 mt-1">Max 10 MB</p>
              </div>
            )}
          </div>
          <div className="sm:w-64 space-y-3">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-[0.15em] text-nothing-grey-500 mb-1.5">Target Role</label>
              <input type="text" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g., Senior Frontend Engineer" className="input-base w-full" />
            </div>
            <Button variant="primary" className="w-full" onClick={handleUpload} isLoading={uploading} disabled={!selectedFile}>Analyze</Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-nothing-grey-400">History</h3>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (<Card key={i}><Skeleton height="60px" /></Card>))}</div>
          ) : analyses.length === 0 ? (
            <Card className="text-center py-8"><p className="text-xs font-mono text-nothing-grey-500">No analyses yet</p></Card>
          ) : (
            analyses.map((a) => (
              <Card key={a.id} hoverable className={clsx('cursor-pointer', selectedAnalysis?.id === a.id && 'border-nothing-red')} padding="sm">
                <div onClick={() => setSelectedAnalysis(a)}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-mono text-nothing-white truncate">{a.file_name}</p>
                    <Badge variant={getStatusBadge(a.processing_status)} size="sm">{a.processing_status}</Badge>
                  </div>
                  {a.target_role && <p className="text-[10px] font-mono text-nothing-grey-600 truncate">{a.target_role}</p>}
                  <div className="flex items-center justify-between mt-2">
                    <span className={clsx('text-lg font-mono font-bold', getScoreColor(a.overall_score))}>{Number(a.overall_score).toFixed(0)}</span>
                    <span className="text-[10px] font-mono text-nothing-grey-600">{new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedAnalysis ? (
            <Card>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-mono text-nothing-white">{selectedAnalysis.file_name}</h3>
                  {selectedAnalysis.target_role && <p className="text-[10px] font-mono text-nothing-grey-500 mt-1">Target: {selectedAnalysis.target_role}</p>}
                </div>
                <div className={clsx('text-3xl font-mono font-bold', getScoreColor(selectedAnalysis.overall_score))}>{Number(selectedAnalysis.overall_score).toFixed(0)}</div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { label: 'Skill Match', score: selectedAnalysis.skill_match_score },
                  { label: 'Experience', score: selectedAnalysis.experience_score },
                  { label: 'Education', score: selectedAnalysis.education_score },
                ].map((item) => (
                  <div key={item.label} className="text-center p-3 border border-nothing-grey-800">
                    <p className={clsx('text-xl font-mono font-bold', getScoreColor(item.score))}>{Number(item.score).toFixed(0)}</p>
                    <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-nothing-grey-500 mt-1">{item.label}</p>
                  </div>
                ))}
              </div>

              {selectedAnalysis.parsed_skills.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-[10px] font-mono uppercase tracking-[0.15em] text-nothing-grey-500 mb-3">Detected Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedAnalysis.parsed_skills.map((skill: string) => (<Badge key={skill}>{skill}</Badge>))}
                  </div>
                </div>
              )}

              {selectedAnalysis.recommendations.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-mono uppercase tracking-[0.15em] text-nothing-grey-500 mb-3">Recommendations</h4>
                  <ul className="space-y-2">
                    {selectedAnalysis.recommendations.map((rec: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-xs font-mono text-nothing-grey-400">
                        <div className="w-1 h-1 bg-nothing-red mt-1.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          ) : (
            <Card className="flex items-center justify-center h-64">
              <p className="text-xs font-mono text-nothing-grey-500">Select an analysis or upload a new resume</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
