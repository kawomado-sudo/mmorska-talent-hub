

## Odpowiedzi na pytania

1. **Klucz Gemini API** — Tak, secret `GOOGLE_GEMINI_API_KEY` jest ustawiony w Supabase i używany bezpośrednio w edge function `parse-cv` (linia 26: `Deno.env.get("GOOGLE_GEMINI_API_KEY")`). Wywołuje Google Gemini 2.0 Flash bezpośrednio przez `generativelanguage.googleapis.com`. To jest Wasz klucz, nie z Lovable AI Gateway.

2. **Propozycja** — Projekt ma też dostęp do `LOVABLE_API_KEY` (Lovable AI Gateway), który daje dostęp do nowszych modeli (Gemini 2.5 Flash/Pro, GPT-5). Można na niego przejść, ale nie jest to konieczne — obecne podejście z własnym kluczem Gemini działa.

## Plan: AI-asystent w formularzu ogłoszenia

Dodanie przycisku "Dopracuj z AI" w `JobFormDialog`, który na podstawie tytułu i szkicowych notatek generuje profesjonalny opis stanowiska, obowiązki i wymagania — dopasowane do MMorskiej (branża jachtowa, konstrukcje stalowe, mały zespół, przyjazna atmosfera).

### 1. Nowa edge function `generate-job-description`

Używa istniejącego `GOOGLE_GEMINI_API_KEY` (spójność z `parse-cv`).

**Wejście:** `{ title, department?, draft_description?, draft_responsibilities?, draft_requirements? }`

**Prompt systemowy** (hardcoded w edge function):
> Jesteś asystentem HR firmy MMorska — firmy z branży jachtowej i konstrukcji stalowych. Firma ceni sobie przyjazne podejście do ludzi i życia, pracę w małym, zgranym zespole. Na podstawie podanego stanowiska i notatek wygeneruj profesjonalne ogłoszenie rekrutacyjne po polsku. Zwróć JSON z polami: description, responsibilities (tablica), requirements (tablica).

**Wyjście:** JSON z `description`, `responsibilities[]`, `requirements[]`

### 2. Zmiany w `JobFormDialog.tsx`

- Nowy przycisk "✨ Dopracuj z AI" pod polem Tytuł (lub na dole sekcji)
- Po kliknięciu: wysyła obecne wartości formularza do edge function
- Wynik AI wypełnia pola `description`, `responsibilities`, `requirements`
- Użytkownik może edytować wynik przed zapisem
- Stan ładowania z komunikatem "AI generuje opis..."
- Przycisk aktywny tylko gdy tytuł jest wypełniony

### 3. Szczegóły techniczne

- Edge function: `supabase/functions/generate-job-description/index.ts`
- Weryfikacja JWT jak w `hr-api`
- Wywołanie przez istniejący helper `hrApi` — albo bezpośredni fetch do nowej funkcji
- Odpowiedź AI konwertowana: `responsibilities` i `requirements` jako tablica → join z `\n` do textarea

### 4. Config

- Dodanie `generate-job-description` do `supabase/config.toml`

