$content = Get-Content "src/pages/Home.tsx" -Raw

$oldImport = "import { useNavigate \}"
$newImport = "import { useNavigate, useLocation \}"
$content = $content.Replace($oldImport, $newImport)

$oldHook = "const navigate = useNavigate();"
$newHook = "const navigate = useNavigate();`n  const location = useLocation();"
$content = $content.Replace($oldHook, $newHook)

$oldLogic = "const filteredVibes = activeFilter === 'All Vibes'`n    ? vibes`n    : vibes.filter(v => v.tags?.toLowerCase().includes(activeFilter.replace(' ', '').toLowerCase()));"
$newLogic = "  // Determine which feed we are on based on the query param`n  const isTrending = location.search.includes('feed=trending');`n  const isFollowing = location.search.includes('feed=following');`n`n  let filteredVibes = activeFilter === 'All Vibes'`n    ? vibes`n    : vibes.filter(v => v.tags?.toLowerCase().includes(activeFilter.replace(' ', '').toLowerCase()));`n`n  // Apply feed sorting/filtering logic`n  if (isTrending) {`n    filteredVibes = [...filteredVibes].sort((a, b) => b.id - a.id); `n  } else if (isFollowing) {`n    filteredVibes = filteredVibes.filter(v => typeof v.author_name === 'string' && ['小仔', '陰陽'].includes(v.author_name));`n  }"

$content = $content.Replace($oldLogic, $newLogic)

Set-Content "src/pages/Home.tsx" -Value $content
