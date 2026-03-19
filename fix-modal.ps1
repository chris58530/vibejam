$content = Get-Content "src/components/AuthModal.tsx" -Raw
$content = $content -replace '<Eye className="w-4 h-4" />', '<span className="material-symbols-outlined text-[16px]">visibility</span>'
$content = $content -replace '<EyeOff className="w-4 h-4" />', '<span className="material-symbols-outlined text-[16px]">visibility_off</span>'
$content = $content -replace '<Upload className="w-5 h-5 text-on-surface" />', '<span className="material-symbols-outlined text-[20px] text-on-surface">upload</span>'
$content = $content -replace '<Upload className="w-6 h-6 text-on-surface/30 mx-auto" />', '<span className="material-symbols-outlined text-[24px] text-on-surface/30 mx-auto">upload</span>'
$content = $content -replace '<Check className="absolute right-9 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400 pointer-events-none" />', '<span className="material-symbols-outlined absolute right-9 top-[40%] -translate-y-1/2 text-[16px] text-green-400 pointer-events-none">check</span>'
Set-Content "src/components/AuthModal.tsx" -Value $content
