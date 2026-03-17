

## Plan: Widok Kanban + nowe statusy rekrutacyjne

### Kontekst

Obecnie kandydatury wyświetlane są wyłącznie jako tabela z filtrami statusów. Statusy: `new`, `reviewing`, `hold`, `accepted`, `rejected`. User chce:

1. **Nowe statusy** będące kolejnym etapem po zaakceptowaniu: `in_review` (W recenzji), `screening_test` (Screening test), `interview` (Rozmowa kwalifikacyjna)
2. **Widok Kanban** — karty kandydatów pogrupowane w kolumnach wg statusu
3. **Logika**: do nowych statusów mogą trafić tylko kandydaci zaakceptowani przez recenzenta/managera

### Zmiany

#### 1. Migracja bazy danych (schemat `hr`)

Tabela `hr.applications` przechowuje status jako `text`. Nie ma enum — wystarczy dodać nowe wartości w kodzie. Migracja nie jest wymagana (status jest kolumną tekstową).

**Weryfikacja**: Sprawdzę czy kolumna `status` jest typu text czy enum. Jeśli enum, dodam nowe wartości.

#### 2. Aktualizacja statusów w kodzie

**Pliki**: `src/pages/Applications.tsx`, `src/components/applications/CandidateDrawer.tsx`

Dodać nowe statusy:
- `in_review` — "W recenzji" (fioletowy)
- `screening_test` — "Screening test" (indygo)  
- `interview` — "Rozmowa kwalifikacyjna" (cyan)

Rozszerzyć `statusFilters`, `statusBadge` i `statusActions` o nowe wartości.

#### 3. Widok Kanban — nowy komponent

**Nowy plik**: `src/components/applications/KanbanBoard.tsx`

- Kolumny odpowiadające statusom (przewijane poziomo)
- Karty z: imię/nazwisko, AI rating, badge statusu, skrót AI summary
- Kliknięcie karty otwiera istniejący `CandidateDrawer`
- Drag & drop (opcjonalnie w przyszłości) — na start bez, zmiana statusu przez drawer

#### 4. Przełącznik widoku tabela/kanban

**Plik**: `src/pages/Applications.tsx`

- Dwa przyciski (ikony List/Grid) do przełączania widoku
- Stan `viewMode: 'table' | 'kanban'`
- Kanban pokazuje wszystkie statusy jako kolumny, tabela działa jak dotychczas

#### 5. Logika ograniczeń statusów

**Plik**: `src/components/applications/CandidateDrawer.tsx`

- Przyciski nowych statusów (`in_review`, `screening_test`, `interview`) widoczne **tylko** gdy kandydat ma status `accepted`
- Recenzent nadal widzi tylko `accepted`/`rejected`
- Manager/admin widzi pełny zestaw przycisków zależnie od aktualnego statusu kandydata

#### 6. Edge Function — brak zmian

`hr-api` operuje na kolumnie `status` jako tekst — nowe wartości będą działać bez zmian w backendzie.

### Kolejność implementacji

1. Dodać nowe statusy do map w `Applications.tsx` i `CandidateDrawer.tsx`
2. Utworzyć komponent `KanbanBoard.tsx`
3. Dodać przełącznik widoku w `Applications.tsx`
4. Dodać logikę ograniczeń przejść statusów w drawerze

