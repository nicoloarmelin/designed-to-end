# Designed to End

Archivio digitale sulle identità visive dei formati di eventi e delle loro edizioni.

[Apri il sito](https://nicoloarmelin.github.io/designed-to-end/)

## Consultazione

- Mosaico con trascinamento e scroll su due assi, inerzia e zoom; indice illustrato degli stessi 100 formati.
- Ricerca e filtri condivisi per ambito, ricorrenza, dimensione, variabilità e presenza di casi studio.
- Una scheda per formato, con informazioni, fonti e marchi/applicazioni raggruppati per anno.
- Sei formati approfonditi nella tesi: 206 edizioni censite e tredici schede di casi studio con progetto, autori, ciclo di vita e date documentate.
- Immagini ingrandibili con didascalia, provenienza e visualizzazione su fondo chiaro/scuro.
- Sezione La ricerca: domanda, metodo, criteri, glossario, gradi di variabilità, bibliografia e crediti.
- Ritorno all’archivio conservando vista, filtri e posizione durante la sessione.

## Dati e immagini

`archive-data.json` contiene il catalogo ricavato dal foglio ARCHIVIO e dalla tesi di Nicolò Armelin. Sono presenti 694 documenti visivi; 42 copie sono state escluse durante l’importazione. Le immagini sono ottimizzate in WebP, con anteprime separate e provenienza registrata nei dati e nei metadati. Gli originali della raccolta locale non sono modificati.

La serie cronologica comprende le edizioni documentate nella tesi. Non è una raccolta completa dei marchi storici: le immagini mancanti sono dichiarate come “Marchio non raccolto”. Alcuni casi studio hanno il testo ma non ancora materiali visivi raccolti. Le osservazioni sul post-evento si riferiscono al momento della stesura della tesi. Gli anni non documentati sono separati dalla cronologia.

Fonti principali: [foglio dell’archivio](https://docs.google.com/spreadsheets/d/1A3mwoeWq-KmiQAyivqjS9WiB3FeHu0FnJkLfcdnkEMM/edit?gid=663382339#gid=663382339), [tesi](https://docs.google.com/document/d/1SdYwlBDB2oN5A1bbvQHCXox-TIBezsS2lDL15tfRCQE/edit?tab=t.0), cartelle di marchi e applicazioni fornite dall’autore. Ogni documento conserva il collegamento alla propria fonte. I diritti delle immagini e dei marchi restano ai rispettivi autori e titolari.

## Tipografia

Instrument Serif, distribuito con SIL Open Font License (`assets/fonts/OFL.txt`), per titoli e lettura; Courier New per i controlli. I caratteri ABC Gaisyr Trial del prototipo non sono inclusi nell’anteprima pubblica.

## Avvio locale e pubblicazione

Il sito è statico: nessuna compilazione o dipendenza richiesta.

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Apri http://127.0.0.1:4173/. GitHub Pages pubblica dal ramo `main`, cartella `/`.
