

## Plan: Podgląd CV w modalu (iframe PDF viewer)

### Co robimy
Dodajemy przycisk "Podgląd CV" w CandidateDrawer, który otwiera modal (Dialog) z osadzonym podglądem PDF za pomocą `<iframe>`. Signed URL jest już generowany — wystarczy go użyć.

### Zmiany

#### 1. `src/components/applications/CandidateDrawer.tsx`
- Dodać state `showCvPreview` (boolean)
- Importować `Dialog, DialogContent, DialogHeader, DialogTitle` z `@/components/ui/dialog`
- Importować ikonę `Eye` z lucide-react
- Obok istniejącego przycisku "Pobierz CV" dodać drugi przycisk "Podgląd CV" z ikoną `Eye`, który ustawia `showCvPreview = true`
- Na końcu komponentu (wewnątrz Sheet) dodać `<Dialog>` z `<iframe src={cvSignedUrl}>` w pełnej wysokości (~80vh), wyświetlający PDF inline
- Dialog zamyka się przez `setShowCvPreview(false)`

Nie wymaga zmian w bazie danych ani edge functions — korzystamy z istniejącego signed URL.

