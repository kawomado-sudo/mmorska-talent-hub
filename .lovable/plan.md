

## Diagnoza

1. **Edge function była przestarzała** — wdrożona wersja nadal używała `gemini-2.0-flash` i miała bug ze stack overflow. Właśnie ją ponownie wdrożyłem (`deploy_edge_functions`) — to rozwiązuje główny problem z parsowaniem CV.

2. **URL do CV nie działa** — bucket `hr-cv` jest **prywatny**, ale `parse-cv` zapisuje `getPublicUrl()` do `cv_url`. Publiczny URL nie zadziała dla prywatnego bucketa → link "Pobierz CV" w drawerze kandydata jest martwy.

## Plan naprawy

### 1. Edge function `parse-cv` — zmiana cv_url
Zamiast `getPublicUrl()`, zapisywać `cv_storage_path` (ścieżkę w storage) do kolumny `cv_url`. Drawer będzie generował signed URL na żądanie.

### 2. `CandidateDrawer.tsx` — signed URL on demand
Przy otwarciu drawera, jeśli `cv_url` zawiera ścieżkę (nie pełny URL), wygenerować signed URL przez `supabase.storage.from('hr-cv').createSignedUrl(path, 3600)` i użyć go do przycisku "Pobierz CV".

### 3. Weryfikacja
Edge function `parse-cv` jest już wdrożona z poprawnym modelem Gemini 2.5 Flash i chunked base64.

