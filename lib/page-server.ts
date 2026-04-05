import fs from 'fs'
import path from 'path'

const PAGES_DIR = path.join(process.cwd(), 'pages-html')

// Map page names to HTML file names
const PAGE_FILES: Record<string, string> = {
  login: 'Login.html',
  dashboard: 'Dashboard.html',
  kontakter: 'Kontakter.html',
  medlemmer: 'Medlemmer.html',
  teams: 'Teams.html',
  produktion: 'Produktion.html',
  rengoring: 'Rengoring.html',
  grupper: 'Grupper.html',
  events: 'Events.html',
  logins: 'UserManagement.html',
}

function readFile(filename: string): string | null {
  try {
    const filePath = path.join(PAGES_DIR, filename)
    if (!fs.existsSync(filePath)) return null
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return null
  }
}

function getSidebarHtml(currentPage: string): string {
  const raw = readFile('Sidebar.html')
  if (!raw) return ''

  return raw
    // Replace GAS template: current page for active highlighting
    .replace(/\<\?!=\s*currentPage\s*\|\|\s*'dashboard'\s*\?>/g, currentPage)
    .replace(/\<\?=\s*currentPage\s*\|\|\s*'dashboard'\s*\?>/g, currentPage)
    // Replace username/role (will be updated by JS, set placeholders)
    .replace(/\<\?=\s*user\s*&&\s*user\.username.*?\?>/g, 'Admin')
    .replace(/\<\?=\s*user\s*&&\s*user\.role.*?\?>/g, 'Administrator')
}

export function serveHtmlPage(page: string): Response {
  const normalizedPage = (page || 'login').toLowerCase()
  const filename = PAGE_FILES[normalizedPage]

  if (!filename) {
    return new Response(notFoundHtml(page), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  }

  const raw = readFile(filename)
  if (!raw) {
    return new Response(errorHtml(`Siden "${page}" blev ikke fundet (fil mangler).`), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  }

  const sidebarHtml = getSidebarHtml(normalizedPage)

  let html = raw
    // Replace CommonJS include
    .replace(/\<\?!=\s*include\(['"]CommonJS['"]\)\s*;\s*\?>/g,
      '<script src="/CommonJS.js"></script>')
    // Replace Sidebar include
    .replace(/\<\?!=\s*include\(['"]Sidebar['"]\)\s*;\s*\?>/g, sidebarHtml)
    // Replace JSON.stringify(scriptUrl) with empty string (was used for GAS navigation)
    .replace(/\<\?!=\s*JSON\.stringify\([^?]*\)\s*\?>/g, "''")
    // Remove any remaining GAS template tags (safety cleanup)
    .replace(/\<\?[!=]?[^>]*\?>/g, '')
    // Remove base target="_top" (not needed outside GAS)
    .replace(/<base\s+target="_top"\s*\/?>/gi, '')

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    }
  })
}

function notFoundHtml(page: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>404</title></head>
<body style="font-family:sans-serif;text-align:center;padding:50px">
<h2>Side ikke fundet: ${page}</h2>
<a href="/?page=dashboard">Tilbage til Dashboard</a>
</body></html>`
}

function errorHtml(msg: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Fejl</title></head>
<body style="font-family:sans-serif;text-align:center;padding:50px">
<h2>Fejl</h2><p>${msg}</p>
<a href="/?page=login">Log ind</a>
</body></html>`
}
