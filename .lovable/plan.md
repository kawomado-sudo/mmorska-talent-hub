

## Plan: Etapowy widok Kanban + nowy status "Oferta"

### Zmiana koncepcji

Zamiast jednego Kanbana ze wszystkimi kolumnami, widok Kanban pokazuje **tylko kolumny danego etapu**. User przełącza się między etapami zakładkami (tabs).

### Etapy

| Etap | Statusy | Warunek wejścia |
|------|---------|-----------------|
| **Etap 1 — Ocena** | `new`, `reviewing`, `hold`, `accepted`, `rejected` | domyślny |
| **Etap 2 — Rekrutacja** | `in_review`, `screening_test`, `interview` | status `accepted` |
| **Etap 3 — Oferta** | `offer` | po `interview` |

### Zmiany w plikach

#### 1. `src/components/applications/KanbanBoard.tsx` — przebudowa

- Dodać tabs/zakładki u góry: "Ocena", "Rekrutacja", "Oferta"
- Każda zakładka filtruje kolumny do swojego zestawu statusów
- Usunąć logikę `coreStatuses` / `visibleColumns` — wyświetlać **wszystkie** kolumny danego etapu (nawet puste)
- Dodać nowy status `offer` (zielony/złoty)

#### 2. `src/pages/Applications.tsx`

- Dodać `offer` do `statusFilters` i `statusBadge`

#### 3. `src/components/applications/CandidateDrawer.tsx`

- Dodać `offer` do `advancedStatusActions` (widoczny gdy status = `interview`)
- Uporządkować flow: z `accepted` → `in_review`/`screening_test`/`interview`, z `interview` → `offer`

### Bez zmian

- Backend/edge function — kolumna `status` jest tekstowa, `offer` zadziała bez migracji
- Widok tabeli — działa jak dotychczas

