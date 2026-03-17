

## Plan: Monit dla recenzenta bez przypisań + naprawa ciemnego ekranu

### Problem 1: Ciemny ekran po zalogowaniu

Przeanalizowałam kod i dane:
- W bazie jest 1 aktywne ogłoszenie (status `active`) — powinno się wyświetlić
- API (hr-api) działa poprawnie (logi sieciowe 200)
- Konto dobrochna.mankowska@mmorska.pl jest na liście ADMIN_EMAILS → powinno mieć pełny dostęp

**Potencjalna przyczyna**: Klient `supabasePublic` w `AuthContext.tsx` to osobna instancja Supabase, która **nie dziedziczy sesji** z `supabaseAuth`. Jeśli tabela `team_members_public` ma włączone RLS bez polityki SELECT dla anon, zapytanie o profil może się nie powieść. Dla admina to nie blokuje dostępu (profil ustawia się na podstawie ADMIN_EMAILS), ale może powodować opóźnienia lub ciche błędy.

**Dodatkowy problem**: Brak obsługi błędów na stronach — jeśli `hrApi` rzuci wyjątek, strona nie pokazuje żadnego komunikatu.

### Problem 2: Recenzent bez przypisań

Recenzent po zalogowaniu trafia na `/jobs`, widzi listę ogłoszeń, klika w jedno i na stronie kandydatur widzi pustą tabelę. Brakuje wyraźnego monitu.

### Zmiany

#### 1. `src/contexts/AuthContext.tsx`
- Użyć `supabaseAuth` zamiast `supabasePublic` do zapytania o `team_members_public` (ten sam klient = ta sama sesja)
- Dodać lepszą obsługę błędów w `loadProfile`

#### 2. `src/pages/Jobs.tsx`
- Dla recenzenta (`isReviewer`) wyświetlić dedykowany widok z komunikatem: "Przejdź do przypisanych kandydatur" lub "Brak przypisanych recenzji"
- Pokazywać tylko ogłoszenia, do których recenzent ma przypisane kandydatury (albo prosty monit z listą ogłoszeń)

#### 3. `src/pages/Applications.tsx`  
- Ulepszyć pusty stan dla recenzenta: wyraźny monit "Nie masz jeszcze przypisanych kandydatur do oceny w tym ogłoszeniu"

#### 4. Obsługa błędów API
- Dodać `onError` w `useQuery` na stronach Jobs i Applications, żeby wyświetlać toast z komunikatem błędu zamiast ciemnego ekranu

