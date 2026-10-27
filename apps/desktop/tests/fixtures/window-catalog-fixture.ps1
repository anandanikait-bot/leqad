$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms

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

[System.Windows.Forms.Application]::Run($form)
