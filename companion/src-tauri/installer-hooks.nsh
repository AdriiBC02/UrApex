; Force installation to Program Files (x86) regardless of default NSIS path
!macro NSIS_HOOK_PREINSTALL
  StrCpy $INSTDIR "$PROGRAMFILES32\UrApex"
!macroend
