' Lance Prestige Pro silencieusement (sans fenêtre visible),
' en resolvant automatiquement le dossier ou se trouve ce fichier.
'
' Utilisation : voir README.md, section "Démarrage automatique (Windows)".

Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = scriptDir
WshShell.Run """" & scriptDir & "\start.bat""", 0, False
