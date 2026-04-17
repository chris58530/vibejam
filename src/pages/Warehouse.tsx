import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { api, Asset, User } from '../lib/api';
import { useI18n } from '../lib/i18n';

async function sha256File(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function categorizeFile(mime: string): string {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'application/pdf') return 'pdf';
  if (
    mime.includes('word') ||
    mime.includes('document') ||
    mime.includes('spreadsheet') ||
    mime.includes('presentation') ||
    mime.startsWith('text/')
  ) return 'document';
  return 'other';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const CATEGORY_ICONS: Record<string, string> = {
  image: 'image',
  audio: 'music_note',
  video: 'videocam',
  pdf: 'picture_as_pdf',
  document: 'description',
  other: 'attach_file',
};

const CATEGORY_COLORS: Record<string, string> = {
  image: '#B3D9FF',
  audio: '#E8B3FF',
  video: '#FFB3B6',
  pdf: '#FFE4B3',
  document: '#B3FFD1',
  other: '#aaaaaa',
};

interface UploadState {
  id: string;
  filename: string;
  status: 'hashing' | 'uploading' | 'done' | 'error' | 'duplicate';
  error?: string;
}

export default function Warehouse({ currentUser }: { currentUser?: User }) {
  const { t } = useI18n();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSupabaseUserId(data.session?.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!supabaseUserId || !currentUser?.is_vip) return;
    setLoading(true);
    api.assets.listAssets(supabaseUserId)
      .then(setAssets)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [supabaseUserId, currentUser?.is_vip]);

  const handleFiles = useCallback(async (files: File[]) => {
    if (!supabase || !supabaseUserId || !currentUser?.is_vip) return;

    for (const file of files) {
      const uid = `${Date.now()}-${Math.random()}`;
      setUploads(prev => [...prev, { id: uid, filename: file.name, status: 'hashing' }]);

      try {
        const hash = await sha256File(file);

        const dedup = await api.assets.checkDedup(supabaseUserId, hash);
        if (dedup.exists && dedup.asset) {
          setUploads(prev => prev.map(u => u.id === uid ? { ...u, status: 'duplicate' } : u));
          setAssets(prev => prev.find(a => a.id === dedup.asset!.id) ? prev : [dedup.asset!, ...prev]);
          setTimeout(() => setUploads(prev => prev.filter(u => u.id !== uid)), 3000);
          continue;
        }

        setUploads(prev => prev.map(u => u.id === uid ? { ...u, status: 'uploading' } : u));

        const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
        const storagePath = `${supabaseUserId}/${hash}${ext ? '.' + ext : ''}`;

        const { error: uploadError } = await supabase.storage
          .from('assets')
          .upload(storagePath, file, { upsert: false, contentType: file.type });

        if (uploadError) throw new Error(uploadError.message);

        const { data: urlData } = supabase.storage.from('assets').getPublicUrl(storagePath);

        const asset = await api.assets.saveAssetMetadata({
          supabase_id: supabaseUserId,
          supabase_path: storagePath,
          public_url: urlData.publicUrl,
          sha256: hash,
          filename: `${hash}${ext ? '.' + ext : ''}`,
          original_name: file.name,
          mime_type: file.type,
          file_size: file.size,
          category: categorizeFile(file.type),
        });

        setAssets(prev => [asset, ...prev]);
        setUploads(prev => prev.map(u => u.id === uid ? { ...u, status: 'done' } : u));
        setTimeout(() => setUploads(prev => prev.filter(u => u.id !== uid)), 3000);
      } catch (err: any) {
        setUploads(prev => prev.map(u => u.id === uid ? { ...u, status: 'error', error: err.message } : u));
        setTimeout(() => setUploads(prev => prev.filter(u => u.id !== uid)), 6000);
      }
    }
  }, [supabase, supabaseUserId, currentUser?.is_vip]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    setIsDragging(true);
  };
  const handleDragLeave = () => {
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  }, [handleFiles]);

  const handleDelete = async (assetId: number) => {
    if (!supabaseUserId) return;
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;
    try {
      if (supabase) {
        await supabase.storage.from('assets').remove([asset.supabase_path]);
      }
      await api.assets.deleteAsset(assetId, supabaseUserId);
      setAssets(prev => prev.filter(a => a.id !== assetId));
    } catch (err: any) {
      console.error('Delete failed:', err);
    }
    setDeleteConfirm(null);
  };

  const copyUrl = (asset: Asset) => {
    navigator.clipboard.writeText(asset.public_url);
    setCopiedId(asset.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalBytes = assets.reduce((sum, a) => sum + a.file_size, 0);
  const QUOTA_BYTES = 1024 * 1024 * 1024;
  const quotaPct = Math.min(100, (totalBytes / QUOTA_BYTES) * 100);

  // Not logged in
  if (!supabaseUserId) {
    return (
      <div className="md:ml-[var(--app-sidebar-width)] transition-[margin] duration-300 flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <span className="material-symbols-outlined text-[52px] text-on-surface/20 mb-4 block" style={{ fontVariationSettings: "'FILL' 1" }}>warehouse</span>
          <p className="text-on-surface/50">{t('warehouse_login_required')}</p>
        </div>
      </div>
    );
  }

  // Not VIP
  if (currentUser && !currentUser.is_vip) {
    return (
      <div className="md:ml-[var(--app-sidebar-width)] transition-[margin] duration-300 flex items-center justify-center min-h-[calc(100vh-64px)] px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-surface-container border border-outline-variant/20 rounded-2xl p-10 text-center"
        >
          <span className="material-symbols-outlined text-[56px] text-amber-400 mb-4 block" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
          <h2 className="text-xl font-bold text-on-surface mb-3">{t('warehouse_vip_locked_title')}</h2>
          <p className="text-sm text-on-surface/50 leading-relaxed">{t('warehouse_vip_locked_desc')}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="md:ml-[var(--app-sidebar-width)] transition-[margin] duration-300 min-h-screen bg-surface"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="max-w-6xl mx-auto px-4 py-6 md:px-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>warehouse</span>
              <h1 className="text-2xl font-bold text-on-surface font-headline">{t('warehouse_title')}</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-400/15 text-amber-400">VIP</span>
            </div>
            <p className="text-sm text-on-surface/40 mt-1 ml-[38px]">{t('warehouse_subtitle')}</p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">upload</span>
            {t('warehouse_upload_btn')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={e => handleFiles(Array.from(e.target.files ?? []))}
          />
        </div>

        {/* Storage quota bar */}
        <div className="mb-6 bg-surface-container-low border border-outline-variant/10 rounded-xl px-4 py-3 flex items-center gap-4">
          <span className="material-symbols-outlined text-[18px] text-on-surface/40 shrink-0">storage</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-on-surface/50">{t('warehouse_storage_used')}</span>
              <span className="text-xs text-on-surface/50 tabular-nums">{formatBytes(totalBytes)} / 1 GB</span>
            </div>
            <div className="h-1.5 bg-outline-variant/20 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  quotaPct > 90 ? 'bg-red-400' : quotaPct > 70 ? 'bg-amber-400' : 'bg-primary'
                }`}
                style={{ width: `${Math.max(quotaPct, 0.5)}%` }}
              />
            </div>
          </div>
          <span className="text-xs text-on-surface/30 tabular-nums shrink-0">{quotaPct.toFixed(1)}%</span>
        </div>

        {/* Upload progress notifications */}
        <AnimatePresence>
          {uploads.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 space-y-2"
            >
              {uploads.map(u => (
                <div key={u.id} className="bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 flex items-center gap-3">
                  <span
                    className={`material-symbols-outlined text-[18px] shrink-0 ${
                      u.status === 'done' ? 'text-green-400' :
                      u.status === 'duplicate' ? 'text-amber-400' :
                      u.status === 'error' ? 'text-red-400' :
                      'text-primary animate-pulse'
                    }`}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {u.status === 'done' ? 'check_circle' :
                     u.status === 'duplicate' ? 'content_copy' :
                     u.status === 'error' ? 'error' :
                     u.status === 'hashing' ? 'fingerprint' : 'cloud_upload'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-on-surface truncate">{u.filename}</p>
                    <p className="text-[11px] text-on-surface/40 mt-0.5">
                      {u.status === 'hashing' ? t('warehouse_status_hashing') :
                       u.status === 'uploading' ? t('warehouse_status_uploading') :
                       u.status === 'done' ? t('warehouse_status_done') :
                       u.status === 'duplicate' ? t('warehouse_status_duplicate') :
                       `${t('warehouse_status_error')}：${u.error}`}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drag overlay */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-primary/10 backdrop-blur-sm flex items-center justify-center pointer-events-none"
            >
              <div className="bg-surface-container-low border-2 border-primary rounded-2xl p-12 text-center shadow-2xl">
                <span className="material-symbols-outlined text-[56px] text-primary mb-3 block" style={{ fontVariationSettings: "'FILL' 1" }}>cloud_upload</span>
                <p className="text-on-surface font-semibold text-lg">{t('warehouse_drop_hint')}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* File grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-square bg-surface-container-low rounded-xl animate-pulse" />
            ))}
          </div>
        ) : assets.length === 0 ? (
          <div
            className="border-2 border-dashed border-outline-variant/30 rounded-2xl p-16 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/3 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="material-symbols-outlined text-[56px] text-on-surface/20 mb-4 block">cloud_upload</span>
            <p className="text-on-surface/50 font-medium mb-1">{t('warehouse_drop_hint')}</p>
            <p className="text-sm text-on-surface/30">{t('warehouse_drop_sub')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {/* Add new card */}
            <div
              className="aspect-square border-2 border-dashed border-outline-variant/20 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="material-symbols-outlined text-[28px] text-on-surface/30">add</span>
              <span className="text-[11px] text-on-surface/30 font-medium">{t('warehouse_add_file')}</span>
            </div>

            {assets.map(asset => (
              <motion.div
                key={asset.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group relative bg-surface-container-low border border-outline-variant/10 rounded-xl overflow-hidden hover:border-outline-variant/30 transition-all flex flex-col"
              >
                {/* Preview area */}
                <div className="aspect-square bg-surface-container flex items-center justify-center overflow-hidden shrink-0">
                  {asset.category === 'image' ? (
                    <img
                      src={asset.public_url}
                      alt={asset.original_name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <span
                        className="material-symbols-outlined text-[36px]"
                        style={{
                          color: CATEGORY_COLORS[asset.category] || CATEGORY_COLORS.other,
                          fontVariationSettings: "'FILL' 1",
                        }}
                      >
                        {CATEGORY_ICONS[asset.category] || 'attach_file'}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-on-surface/30 font-bold">
                        {asset.mime_type.split('/')[1]?.slice(0, 8) || asset.category}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="px-2.5 pt-2 pb-1 flex-1">
                  <p className="text-[12px] font-medium text-on-surface truncate" title={asset.original_name}>
                    {asset.original_name}
                  </p>
                  <p className="text-[11px] text-on-surface/40 mt-0.5 tabular-nums">{formatBytes(asset.file_size)}</p>
                </div>

                {/* Actions */}
                <div className="px-2 pb-2 flex gap-1">
                  <button
                    onClick={() => copyUrl(asset)}
                    className="flex-1 flex items-center justify-center gap-1 text-[11px] py-1.5 rounded-lg bg-surface-container hover:bg-primary/10 hover:text-primary transition-colors text-on-surface/60"
                  >
                    <span className="material-symbols-outlined text-[13px]">
                      {copiedId === asset.id ? 'check' : 'content_copy'}
                    </span>
                    {copiedId === asset.id ? t('warehouse_copied') : t('warehouse_copy_url')}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(asset.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors text-on-surface/30"
                    title={t('warehouse_delete_confirm')}
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                  </button>
                </div>

                {/* Delete confirm overlay */}
                <AnimatePresence>
                  {deleteConfirm === asset.id && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-surface-container-low/95 backdrop-blur-sm flex flex-col items-center justify-center gap-3 rounded-xl"
                    >
                      <p className="text-[12px] text-on-surface/70 text-center px-4 leading-relaxed">
                        {t('warehouse_delete_confirm')}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(asset.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-[12px] font-semibold hover:bg-red-600 transition-colors"
                        >
                          {t('warehouse_delete_btn')}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface/60 text-[12px] hover:bg-surface-container-high transition-colors"
                        >
                          {t('warehouse_cancel')}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
