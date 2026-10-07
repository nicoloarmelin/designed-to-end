# Designed to End

Archivio digitale sulle identità visive dei formati di eventi e delle loro edizioni.

[Apri il sito](https://nicoloarmelin.github.io/designed-to-end/)

## Consultazione

- Mosaico con trascinamento e scroll su due assi, inerzia e zoom; ogni formato occupa una posizione unica, senza righe duplicate. Indice illustrato degli stessi 100 formati.
- Titolo iniziale in negativo sulle immagini, che scompare quando si esplora la mappa.
- Ricerca e filtri condivisi per ambito, ricorrenza, dimensione, variabilità e presenza di casi studio.
- Schede editoriali con applicazioni grandi, marchi compatti, proporzioni originali e didascalie; informazioni e fonti, con materiali raggruppati per anno.
- Sei formati approfonditi nella tesi: 206 edizioni censite e tredici schede di casi studio con progetto, autori, ciclo di vita e date documentate.
- Immagini ingrandibili con didascalia, provenienza e visualizzazione su fondo chiaro/scuro.
- Sezione La ricerca: domanda, metodo, criteri, glossario, gradi di variabilità, bibliografia e crediti.
- Ritorno all’archivio conservando vista, filtri e posizione durante la sessione.

## Dati e immagini

`archive-data.json` contiene il catalogo ricavato dal foglio ARCHIVIO e dalla tesi di Nicolò Armelin. Sono presenti 694 documenti visivi; 42 copie sono state escluse durante l’importazione. Le immagini sono ottimizzate in WebP, con anteprime separate e provenienza registrata nei dati e nei metadati. Gli originali della raccolta locale non sono modificati.

La serie cronologica comprende le edizioni documentate nella tesi. Non è una raccolta completa dei marchi storici: le immagini mancanti sono dichiarate come “Marchio non raccolto”. Alcuni casi studio hanno il testo ma non ancora materiali visivi raccolti. Le osservazioni sul post-evento si riferiscono al momento della stesura della tesi. Gli anni non documentati sono separati dalla cronologia.

Fonti principali: [foglio dell’archivio](https://docs.google.com/spreadsheets/d/1A3mwoeWq-KmiQAyivqjS9WiB3FeHu0FnJkLfcdnkEMM/edit?gid=663382339#gid=663382339), [tesi](https://docs.google.com/document/d/1SdYwlBDB2oN5A1bbvQHCXox-TIBezsS2lDL15tfRCQE/edit?tab=t.0), cartelle di marchi e applicazioni fornite dall’autore. Ogni documento conserva il collegamento alla propria fonte. I diritti delle immagini e dei marchi restano ai rispettivi autori e titolari.

## Tipografia

Office Times di Boulevard LAB: Mono per titoli, menù e controlli; Regular per i testi. I due WOFF2 forniti dall’autore sono inclusi per il sito con licenza web o autorizzazione confermata. Instrument Serif (SIL Open Font License, `assets/fonts/OFL.txt`) rimane come ripiego.

Il menù principale è una barra frost glass compatta: centrata in alto su desktop e in basso su telefono. Ricerca e filtri sono condivisi dal mosaico e dall’indice.

## Avvio locale e pubblicazione

Il sito è statico: nessuna compilazione o dipendenza richiesta.

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Apri http://127.0.0.1:4173/. GitHub Pages pubblica dal ramo `main`, cartella `/`.

Lo zoom del mosaico risponde al gesto di pizzicare sul trackpad, a Ctrl/Cmd/Alt + rotella del mouse e ai pulsanti +/−. Lo scroll normale mantiene lo spostamento sui due assi; il limite inferiore si adatta allo schermo e ricentra tutti i formati in una panoramica completa, senza duplicazioni. Sono disponibili anche il gesto a due dita su schermo touch e i tasti +/− con la mappa a fuoco.

Precisazione utente 7 ottobre 2026: il mosaico è una mappa FINITA, con coordinate fisse e un solo elemento per formato. Lo spostamento della camera si ferma ai bordi del catalogo, senza ricircolo o righe/colonne ripetute. Sono mantenuti trascinamento e scroll sui due assi, inerzia breve, zoom mouse/trackpad e panoramica di tutti i 100 formati.

Precisazione grafica 7 ottobre 2026: mosaico masonry compatto, colonne di immagini ad altezze variabili con 16px fra elementi (alla scala 100%), senza testi sotto le immagini. Anche nelle gallerie delle schede non si mostrano didascalie o fonti su ciascuna foto: informazioni e provenienza restano nella consultazione ingrandita. L’indice mantiene i nomi adiacenti alle miniature, necessari per identificare i 100 formati.

Ultima direzione confermata 7 ottobre 2026: la richiesta di meno rigidità riguarda la DISPOSIZIONE, non il movimento. Mosaico più spontaneo con più spazio bianco: immagini a dimensioni variabili, partenze e allineamenti sfalsati, distanze irregolari. Le coordinate restano deterministiche e fisse durante scroll/drag/zoom, senza ricircolo; nessuna etichetta sotto le immagini. Questa direzione supera la precedente uniformità delle colonne compatte da 220px/16px.
