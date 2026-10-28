$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class LeqadFixtureVisibility {
  [DllImport("user32.dll")]
  public static extern bool IsWindowVisible(IntPtr window);
}
'@

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Leqad disposable local window'
$form.StartPosition = 'CenterScreen'
$form.ClientSize = New-Object System.Drawing.Size(420, 180)
$form.ShowInTaskbar = $true
$form.MinimizeBox = $false
$form.MaximizeBox = $false

$label = New-Object System.Windows.Forms.Label
$label.Text = 'Disposable window selection fixture'
$label.AutoSize = $true
$label.Location = New-Object System.Drawing.Point(16, 20)
$form.Controls.Add($label)

$form.Add_Shown({
  if (-not [LeqadFixtureVisibility]::IsWindowVisible($form.Handle)) {
    [Console]::WriteLine('WINDOW_NOT_VISIBLE')
    $form.Close()
    return
  }
  # Consumed privately by the parent test; never logged or saved to artifacts.
  [Console]::WriteLine('WINDOW_READY:' + $PID)
})
[System.Windows.Forms.Application]::Run($form)
