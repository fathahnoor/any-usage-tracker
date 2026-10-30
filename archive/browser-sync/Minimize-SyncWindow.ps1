param([switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class NexusWindow {
 public delegate bool EnumProc(IntPtr hwnd, IntPtr parameter);
 [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc callback, IntPtr parameter);
 [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hwnd, StringBuilder text, int length);
 [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hwnd, int command);
 [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hwnd);
}
'@
$foundWindows = [System.Collections.Generic.List[object]]::new()
$callback = [NexusWindow+EnumProc] {
 param($handle, $parameter)
 $title = [System.Text.StringBuilder]::new(1024)
 [void][NexusWindow]::GetWindowText($handle, $title, $title.Capacity)
 if ($title.ToString().StartsWith('NEXUS Background Sync')) {
   if (-not $CheckOnly) { [void][NexusWindow]::ShowWindowAsync($handle, 6) }
   $foundWindows.Add([pscustomobject]@{ Handle=$handle.ToInt64(); Minimized=[NexusWindow]::IsIconic($handle) })
 }
 return $true
}
[void][NexusWindow]::EnumWindows($callback, [IntPtr]::Zero)
if ($foundWindows.Count -eq 0) { throw 'Jendela NEXUS Background Sync tidak ditemukan' }
$foundWindows | ConvertTo-Json -Compress
