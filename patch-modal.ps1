$content = Get-Content "src/components/AuthModal.tsx" -Raw
$content = $content -replace "import { X, Eye, EyeOff, Upload, Check, ArrowLeft } from 'lucide-react';", ""
$content = $content -replace "<X className=`"w-5 h-5`" />", "<span className=`"material-symbols-outlined text-[20px]`">close</span>"
$content = $content -replace "<ArrowLeft className=`"w-4 h-4`" />", "<span className=`"material-symbols-outlined text-[16px]`">arrow_back</span>"
$content = $content -replace "<Eye className=`"w-5 h-5`" />", "<span className=`"material-symbols-outlined text-[20px]`">visibility</span>"
$content = $content -replace "<EyeOff className=`"w-5 h-5`" />", "<span className=`"material-symbols-outlined text-[20px]`">visibility_off</span>"
$content = $content -replace "<Upload className=`"w-5 h-5 text-white/30`" />", "<span className=`"material-symbols-outlined text-[20px] text-on-surface/30`">upload</span>"
$content = $content -replace "<Check className=`"w-4 h-4`" />", "<span className=`"material-symbols-outlined text-[16px]`">check</span>"

$content = $content -replace "bg-\[#0d0d1a\] border border-white/10 rounded-2xl", "bg-surface-container-low border border-outline-variant/20 rounded-xl"
$content = $content -replace "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500", "bg-primary text-on-primary font-mono tracking-widest uppercase hover:bg-primary-fixed"
$content = $content -replace "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500\`"", "bg-primary\`""

$content = $content -replace "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors", "w-full bg-surface-container border border-outline-variant/10 rounded-lg px-4 py-3 text-on-surface placeholder:text-on-surface/30 text-sm focus:outline-none focus:border-primary/50 transition-colors font-mono"
$content = $content -replace "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors", "w-full bg-surface-container border border-outline-variant/10 rounded-lg px-4 py-3 pr-11 text-on-surface placeholder:text-on-surface/30 text-sm focus:outline-none focus:border-primary/50 transition-colors font-mono"

# Generic colors
$content = $content -replace "text-white/40", "text-on-surface/40"
$content = $content -replace "text-white/30", "text-on-surface/30"
$content = $content -replace "text-white/20", "text-on-surface/20"
$content = $content -replace "text-white", "text-on-surface"
$content = $content -replace "border-white/10", "border-outline-variant/10"
$content = $content -replace "border-white/5", "border-outline-variant/5"
$content = $content -replace "focus:border-indigo-500/50", "focus:border-primary/50"

Set-Content "src/components/AuthModal.tsx" -Value $content
