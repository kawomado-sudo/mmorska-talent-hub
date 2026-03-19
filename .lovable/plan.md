

## Plan: Zwiększenie limitu znaków notatek rekrutera / recenzji

### Obecny stan

Aktualnie **nie ma żadnego jawnego limitu znaków** — ani w UI (`Textarea` bez `maxLength`), ani w bazie danych (kolumna `text` bez ograniczeń), ani w edge function. Textarea jest po prostu wizualnie mała (3-4 wiersze), co może sprawiać wrażenie ograniczenia.

### Zmiany

Ustawię jawny limit i pokażę licznik znaków, aby użytkownik wiedział ile może wpisać:

#### `src/components/applications/CandidateDrawer.tsx`

1. **Notatki rekrutera** (linia 280): dodać `maxLength={1500}`, zwiększyć `rows` z 3 na 5, dodać licznik znaków pod textarea (np. "234 / 1500").

2. **Notatka recenzji** (linia 251-254): dodać `maxLength={1500}`, zwiększyć `rows` z 4 na 6, dodać analogiczny licznik znaków.

Przyjmuję bazowy limit 500 znaków × 3 = **1500 znaków** dla obu pól.

