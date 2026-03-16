

## Aktualizacja Design System — MMorska 2026-03

Użytkownik przesłał dwa pliki definiujące nowy system wizualny MMorska. Zmiany obejmują przejście z ciemnego motywu na jasny (light) z opcją dark mode, nową paletę kolorów (teal primary, gold accent, navy sidebar) oraz dodanie fontu Montserrat dla nagłówków.

### Zmiany

#### 1. `src/index.css` — zastąpienie CSS variables
- Nowa paleta: teal primary (`#0f7173`), gold accent (`#fabb5b`), navy sidebar (`#14213d`)
- Jasne tło (`--background: 30 14% 95%`) zamiast ciemnego
- Dodanie wariantu `.dark` z ciemnymi kolorami
- Import fontu Montserrat obok Inter
- Reguła `h1–h6 { font-family: 'Montserrat' }`

#### 2. `tailwind.config.ts` — font families
- Dodanie `fontFamily.sans` (Inter) i `fontFamily.heading` (Montserrat)
- Reszta struktury bez zmian (colors, borderRadius, animations identyczne)

#### 3. Ocena wpływu na UI
- Sidebar, karty, przyciski, tekst — wszystko używa CSS variables, więc zmiana palety zadziała automatycznie
- Nagłówki dostaną Montserrat przez regułę CSS base layer
- Logo "MMORSKA" na login page — kolor tła się zmieni z ciemnego na jasny; może wymagać dostosowania, ale to osobna iteracja

