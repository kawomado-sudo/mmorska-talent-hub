## MMorska — Wewnętrzny Panel Rekrutera

### Przegląd

Aplikacja do zarządzania rekrutacją: ogłoszenia o pracę, kandydatury z AI summary, zmiana statusów z logowaniem historii, ustawienia formularza. Ciemny/jasny motyw do wyboru, logowanie wyłącznie przez Microsoft Azure AD.

### Konfiguracja

1. **Logo MMorska** — skopiowanie przesłanego pliku do `src/assets/`
2. **Supabase client** — dodanie schematu `hr` do konfiguracji klienta (`db: { schema: 'hr' }`)
3. **Motyw ciemny** — przebudowa CSS variables: tło `#130f0c`, sidebar `#1a1410`, karty `#211b17`, obramowania `#2e2620`, akcent `#0ea5e9`
4. **Font Inter** — import z Google Fonts

### Autoryzacja

- `AuthProvider` context z `onAuthStateChange` + `getSession`
- `supabase.auth.signInWithOAuth({ provider: 'azure' })` — jedyna metoda logowania
- `ProtectedRoute` component — brak sesji → redirect `/login`
- Przycisk wylogowania w sidebarze

### Strona `/login`

- Wyśrodkowane logo MMorska na ciemnym tle
- Przycisk "Zaloguj przez Microsoft" z ikoną Windows
- Brak pól email/hasło

### Layout z Sidebarem

- Ciemny sidebar z linkami: Ogłoszenia, Ustawienia
- Przycisk "Wyloguj" na dole
- Kompaktowy, profesjonalny design

### Strona `/jobs` — Ogłoszenia

- Tabela: Tytuł, Dział, Status (badge: draft=szary, active=zielony, closed=czerwony), Liczba kandydatur, Data utworzenia, Akcje (edytuj/usuń)
- Przycisk "Nowe ogłoszenie" → modal z formularzem
- Formularz: Tytuł, Dział, Opis, Obowiązki (dynamiczna lista), Wymagania (dynamiczna lista), Status
- Kliknięcie wiersza → nawigacja do `/jobs/:id/applications`
- Liczba kandydatur pobierana z `hr.applications` (count per job)

### Strona `/jobs/:id/applications` — Kandydatury

- Nagłówek z nazwą stanowiska + link powrotny
- Taby/filtry statusu: Wszystkie / Nowe / W ocenie / Hold / Zaakceptowane / Odrzucone
- Tabela: Imię i nazwisko, Email, Data aplikacji, Status (badge), AI Summary (skrócone 80 zn.), Akcje
- Kliknięcie wiersza → drawer boczny

### Drawer kandydata

- Dane kontaktowe: imię, nazwisko, email, telefon
- CV: link lub przycisk pobierania (zależnie od `cv_link` / `cv_url`)
- List motywacyjny (przewijany)
- Sekcja AI Summary z ikoną ✨ i wyróżnioną ramką
- Edytowalne pole "Notatki rekrutera" z zapisem inline
- Przyciski zmiany statusu (kolorowe, aktywny podświetlony)
- **Zmiana statusu**: `UPDATE hr.applications` + `INSERT hr.application_status_log` w jednej operacji
- Historia statusów — chronologiczna lista zmian

### Strona `/settings` — Ustawienia formularza

- Formularz z polami z `hr.form_config` (klucz-wartość)
- Pola: tytuł/opis nagłówka, kroki procesu, tagi "Pracujemy w" (chips), tekst RODO, ekran sukcesu
- Przycisk "Zapisz zmiany" → upsert do `hr.form_config`

### Ważne szczegóły techniczne

- Schemat `hr` musi być eksponowany w Supabase Dashboard (API Settings → Exposed schemas)
- Osobny klient Supabase lub parametr `schema: 'hr'` przy każdym zapytaniu
- Brak jakiegokolwiek email/password auth w kodzie
- Status change = UPDATE + INSERT log (atomowo)