# Urmărirea dronelor

[English](README.md) · [Русский](README.ru.md) · [Română](README.ro.md)

O simulare de urmărire ciclică pentru Wine Dynamics / Project Kinetica. Fiecare dronă urmărește următoarea dronă în sensul acelor de ceasornic. Toate au aceeași viteză, iar pozițiile se actualizează simultan.

## Pornire

```sh
bun install
bun --bun run dev
```

Compilare pentru producție și verificări:

```sh
bun --bun run build
bun test
```

## Comenzi

- **Limbă:** engleză, rusă sau română. La prima deschidere este selectată engleza. Alegerea se păstrează în browser dacă stocarea locală este disponibilă. Schimbarea limbii nu resetează simularea.
- **Figură:** între 3 și 256 de drone, apoi un mod separat **Cerc / ∞**. Toate cele 254 de poligoane finite au denumiri complete, de la Triunghi la Dihectapentacontahexagon, cu numărul laturilor alături.
- **Viteză:** între 0,1 și 50 m/s. Modificarea se aplică imediat, inclusiv în pauză. Pozițiile și timpul scurs se păstrează.
- **Dimensiune:** un cursor pentru lungimea laturii sau perimetrul total. Intervalul obișnuit este 0,1–100 m pe latură; pentru perimetru se înmulțește cu numărul dronelor. Schimbarea modului de măsurare convertește valoarea și păstrează dimensiunea fizică. Limitele cursorului se extind dacă este necesar pentru a păstra valoarea convertită. În modul Cerc, valoarea reprezintă circumferința.
- **Pornește / Pauză:** pornește, suspendă sau continuă simularea. În pauză, timpul nu avansează. Pornirea după încheiere începe o simulare nouă.
- **Stop:** resetează pozițiile, timpul, drumul parcurs și urmele. Schimbarea figurii sau a dimensiunii resetează și ea simularea.
- **Schimb:** inversează poziția celor două panouri. Pe un ecran îngust, inversează ordinea lor verticală.

Opțiunile de afișare controlează urmele, conturul inițial și cel curent, centrul și săgețile vitezei. Ele nu modifică fizica. Fiecare bifă are o etichetă `.toggle`, un câmp de intrare și un `.toggle-indicator`. Indicatorul poate fi transformat ulterior într-un comutator cu două poziții doar prin CSS.

Scara automată urmărește raza curentă a dronelor și lasă pe fiecare parte aproximativ 10% din dimensiunea mai mică a zonei de simulare. Camera folosește raza, nu dreptunghiul care încadrează poligonul în rotație, deci nu pulsează odată cu rotirea lui. Schimbarea scării este netezită, cu o mică toleranță de urmărire. Urmele vechi și conturul inițial pot ieși din cadru. La încheiere, camera nu mai mărește imaginea. Reglarea manuală dezactivează scara automată. Scara și redimensionarea ferestrei nu schimbă coordonatele în metri.

## Fizică

Fie `N` numărul dronelor, `v` viteza în m/s, `s` lungimea inițială a laturii și `P` perimetrul inițial. Raza cercului circumscris este:

```text
s = P / N
R0 = s / (2 sin(π/N)) = P / (2N sin(π/N))
```

La fiecare etapă de integrare, viteza dronei `i` este orientată către drona `(i + 1) mod N`:

```text
velocity[i] = v × (position[next] − position[i])
                / |position[next] − position[i]|
```

Toate vitezele sunt calculate din același set de poziții, înainte de actualizarea oricărei poziții. Motorul folosește metoda Runge–Kutta de ordinul patru, cu pași ficși de 1/240 s și subpași mai mici în apropierea întâlnirii. Traiectoriile rezultă din urmărirea numerică; nu sunt generate din formula unei spirale.

Pentru un poligon regulat, coarda către drona următoare este orientată spre interior la un unghi `π/N` față de tangentă. Rezultă:

```text
viteza radială = v sin(π/N)
viteza tangențială = v cos(π/N)
R(t) = R0 − v sin(π/N)t
T = R0 / (v sin(π/N)) = s / (2v sin²(π/N))
```

Raza în scădere și rotația continuă produc spirale logaritmice. Formulele servesc la predicții și verificarea preciziei. Dacă viteza se schimbă, raza așteptată folosește valoarea acumulată `∫v dt`. Timpul întâlnirii este estimat de la începutul simulării, presupunând că noua viteză rămâne constantă.

Pentru orice `N` finit, `sin(π/N)` este pozitiv. Un poligon cu multe laturi poate părea o orbită, dar converge în cele din urmă. Interfața îl numește „Cvasi-orbită” când fracția radială a vitezei este sub 0,05.

**Modul Cerc este o limită ideală separată.** Viteza radială este zero, viteza tangențială este `v`, iar timpul întâlnirii este infinit. Sunt afișate 64 de puncte care se rotesc cu viteza unghiulară `v/R`. Aceste puncte nu formează un poligon finit de urmărire. Raza este `P/(2π)`.

O simulare finită se încheie când raza teoretică rămasă scade sub `min(10⁻⁵ m, R0 × 10⁻⁵)`. Dronele sunt plasate în centru, iar calculul se oprește. Astfel se evită singularitatea numerică de la coincidența exactă a pozițiilor.

## Statistici și precizie

Blocul de sus afișează timpul simulării, distanța medie dintre vecini, raza medie, drumul mediu parcurs de o dronă, timpul estimat al întâlnirii și starea. Deschide **Fizică și precizie** pentru vitezele radială și tangențială și pentru erori.

```text
eroarea razei (%) = |raza simulată − raza așteptată| / R0 × 100
```

Împărțirea la raza inițială păstrează eroarea definită și la întâlnire. Pentru poligoane, drumul însumează deplasările numerice; pentru cerc se folosește lungimea exactă a arcului. Eroarea drumului compară rezultatul cu `∫v dt`. Textul explicativ afișat la trecerea cursorului peste eroare include dispersia razelor și a distanțelor dintre vecini.

Urma fiecărei drone păstrează cel mult 1 024 de puncte, înregistrate la maximum 30 Hz de timp simulat. Când urmele sunt ascunse, înregistrarea se oprește. În simulările lungi, punctele noi le înlocuiesc pe cele vechi. Întârzierea unui cadru este limitată la 0,1 s; revenirea dintr-o filă de fundal nu recuperează timpul petrecut acolo. Poligoanele foarte mici și rapide pot atinge limita de subpași și pot evolua mai lent decât timpul real. Timpul afișat rămâne cel efectiv integrat.

## Fișiere

- `src/simulation.ts`: fizică, stare și măsurători, fără dependențe DOM.
- `src/renderer.ts`: desenare pe canvas, scară și densitatea pixelilor.
- `src/main.ts`: comenzi, statistici și o singură buclă de animație.
- `src/i18n.ts`: traduceri și denumirile poligoanelor.
- `src/main.css`: butoanele originale, aranjarea setărilor și indicatoarele bifelor.
- `tests/`: verificări ale fizicii, camerei și comenzilor într-un mediu DOM simulat. Ele nu înlocuiesc verificarea vizuală în browser.

## Explicații și navigarea camerei

**Navigarea liberă este dezactivată implicit.** Scara rămâne ancorată în centrul inițial, iar deplasarea este blocată. Activează opțiunea pentru gesturile libere de mai jos. Dezactivarea recentrează fără să schimbe scara, setarea automată sau starea simulării. Butonul Centrează recentrează în continuare și reactivează scara automată.

Apasă `(?)` pentru a afla ce înseamnă o mărime, de ce contează și cum se calculează. Explicațiile sunt accesibile cu mouse-ul, prin atingere și cu tastatura. Explicația stării distinge cvasi-orbita finită de orbita stabilă ideală. Închide dialogul cu butonul său sau cu Escape. Deschiderea explicației nu pune simularea în pauză; apasă Pauză înainte dacă vrei să examinezi un singur moment.

Pe canvas, derularea mărește în jurul cursorului, iar tragerea deplasează camera de la centrul inițial. Pe ecranele tactile, un deget deplasează imaginea, iar gestul cu două degete modifică scara. Când canvasul are focalizarea, +/− schimbă scara, săgețile deplasează camera, iar Home recentrează și reia scara automată. Dublu clic sau activarea scării automate fac același lucru. Cursorul de scară funcționează în jurul centrului actual al camerei, inclusiv după deplasare. Camera nu modifică pozițiile fizice ale dronelor.

`src/polygon-names.ts` conține tabelul explicit cu 254 de intrări în engleză, rusă și română. Folosește o convenție consecventă de prefixe grecești, cu forme compuse localizate și denumiri uzuale pentru figurile mici. Nu presupune că aceste forme sunt singurele scrieri oficiale. De exemplu, 256 = 200 + 50 + 6: dihecta + pentaconta + hexa + gon. Referințe pentru denumiri și prefixe: [Math.com](https://www.math.com/tables/geometry/polygons.htm), [Math Is Fun](https://www.mathsisfun.com/geometry/polygons.html).

`src/help.ts` conține explicațiile traduse și comportamentul dialogului. `src/navigation.ts` conectează mouse-ul, gesturile tactile și tastatura la cameră.

