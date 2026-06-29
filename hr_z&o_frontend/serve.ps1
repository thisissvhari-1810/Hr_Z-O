# --------------------------------------------------------------------
# serve.ps1 — tiny static file server for the PeopleFlow site.
# Uses only built-in Windows .NET, so no installs are required.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\serve.ps1
#   powershell -ExecutionPolicy Bypass -File .\serve.ps1 -Port 3000
# --------------------------------------------------------------------

param(
    [int]$Port = 4000,
    [string]$Root = (Get-Location).Path
)

$prefix = "http://localhost:$Port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    Write-Host "Failed to bind to $prefix" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# MIME types we care about for a static site.
$mime = @{
    ".html"        = "text/html; charset=utf-8"
    ".htm"         = "text/html; charset=utf-8"
    ".css"         = "text/css; charset=utf-8"
    ".js"          = "application/javascript; charset=utf-8"
    ".mjs"         = "application/javascript; charset=utf-8"
    ".json"        = "application/json; charset=utf-8"
    ".webmanifest" = "application/manifest+json"
    ".xml"         = "application/xml; charset=utf-8"
    ".txt"         = "text/plain; charset=utf-8"
    ".svg"         = "image/svg+xml"
    ".png"         = "image/png"
    ".jpg"         = "image/jpeg"
    ".jpeg"        = "image/jpeg"
    ".gif"         = "image/gif"
    ".ico"         = "image/x-icon"
    ".webp"        = "image/webp"
    ".woff"        = "font/woff"
    ".woff2"       = "font/woff2"
    ".ttf"         = "font/ttf"
    ".otf"         = "font/otf"
    ".map"         = "application/json"
    ".pdf"         = "application/pdf"
}

Write-Host ""
Write-Host "  PeopleFlow dev server running" -ForegroundColor Green
Write-Host "  -> $prefix"                    -ForegroundColor Cyan
Write-Host "  serving: $Root"
Write-Host "  press Ctrl+C to stop"
Write-Host ""

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $urlPath = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath)
        if ($urlPath -eq "/") { $urlPath = "/index.html" }

        # Resolve the requested file inside the root, preventing path traversal.
        $rel = $urlPath.TrimStart("/").Replace("/", [IO.Path]::DirectorySeparatorChar)
        $filePath = [IO.Path]::GetFullPath((Join-Path $Root $rel))

        if (-not $filePath.StartsWith($Root, [System.StringComparison]::OrdinalIgnoreCase)) {
            $response.StatusCode = 403
            $response.Close()
            continue
        }

        # Directory request -> serve its index.html if present.
        if ((Test-Path $filePath -PathType Container)) {
            $candidate = Join-Path $filePath "index.html"
            if (Test-Path $candidate -PathType Leaf) { $filePath = $candidate }
        }

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [IO.Path]::GetExtension($filePath).ToLower()
            $response.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" }

            try {
                $bytes = [IO.File]::ReadAllBytes($filePath)
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                Write-Host ("  200  {0}" -f $urlPath) -ForegroundColor DarkGray
            } catch {
                $response.StatusCode = 500
                Write-Host ("  500  {0}" -f $urlPath) -ForegroundColor Red
            }
        } else {
            # Fall back to 404.html if it exists, otherwise plain text.
            $custom404 = Join-Path $Root "404.html"
            if (Test-Path $custom404 -PathType Leaf) {
                $response.StatusCode = 404
                $response.ContentType = "text/html; charset=utf-8"
                $bytes = [IO.File]::ReadAllBytes($custom404)
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 404
                $msg = [Text.Encoding]::UTF8.GetBytes("404 Not Found: $urlPath")
                $response.OutputStream.Write($msg, 0, $msg.Length)
            }
            Write-Host ("  404  {0}" -f $urlPath) -ForegroundColor Yellow
        }

        $response.Close()
    }
}
finally {
    $listener.Stop()
    $listener.Close()
    Write-Host ""
    Write-Host "Server stopped." -ForegroundColor Yellow
}
