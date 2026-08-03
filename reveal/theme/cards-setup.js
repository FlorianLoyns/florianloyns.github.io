/* =====================================================================
   Cards – zentrale reveal.js-Einrichtung (einmal pflegen, alle nutzen)
   Einbinden je Vortrag NACH den Plugin-Skripten:
     <script src="../_reveal/theme/cards-setup.js"></script>
     <script>CardsDeck.init();</script>
   Navigation: Smallcontrol · Bedienleiste (Übersicht/Vollbild): RevealTouchControls
   ===================================================================== */
(function (global) {

  var doc = document;

  /* Wo liegt _reveal? Aus dem eigenen <script src> ableiten, damit die
     Nachlade-Pfade unabhaengig vom Ordner des Vortrags stimmen. */
  var ME = doc.currentScript || (function () {
    var a = doc.getElementsByTagName('script');
    for (var i = a.length - 1; i >= 0; i--) if (/cards-setup\.js/.test(a[i].src)) return a[i];
    return null;
  })();
  var BASE = ME ? ME.src.replace(/theme\/cards-setup\.js.*$/, '') : '../_reveal/';
  /* Versionsstempel aus dem eigenen Aufruf uebernehmen (…/cards-setup.js?v=2026-07-28).
     Die Vortraege stempeln nur, was in ihrem HTML steht - die hier nachgeladenen
     Plugins nicht. Ohne diesen Anhang holt der Browser sie aus dem Zwischenspeicher
     und eine neue Plugin-Fassung kaeme beim Vortragenden nie an. */
  var VER = (ME && /\?/.test(ME.src)) ? ME.src.slice(ME.src.indexOf('?')) : '';

  function addCSS(href){
    if (doc.querySelector('link[data-cards-css="' + href + '"]')) return;
    var l = doc.createElement('link');
    l.rel = 'stylesheet'; l.href = href + VER; l.setAttribute('data-cards-css', href);
    doc.head.appendChild(l);
  }
  /* Nachladen statt in jedem Vortrag ein <script>-Tag zu pflegen. Schlaegt es
     fehl (Datei fehlt, offline), wird trotzdem initialisiert - dann eben ohne
     das betroffene Plugin. Zweiter Parameter ist der globale Name: ist der
     schon da (Vortrag laedt das Skript selbst), wird nicht nochmal geladen. */
  function addJS(src, name, cb){
    if (global[name]) return cb();
    var s = doc.createElement('script');
    s.src = src + VER; s.onload = cb; s.onerror = cb;
    doc.head.appendChild(s);
  }
  /* Liste nacheinander nachladen, dann weiter. */
  function addAllJS(list, done){
    var i = 0;
    (function next(){
      if (i >= list.length) return done();
      var e = list[i++];
      addJS(e[0], e[1], next);
    })();
  }

  function wireQuiz(){
    doc.querySelectorAll('.opt').forEach(function (opt) {
      // kein Fokus beim Antippen -> reveal scrollt die Folie nicht nach
      opt.addEventListener('mousedown', function (e) { e.preventDefault(); });
      opt.addEventListener('click', function (e) {
        e.stopPropagation();
        var q = opt.closest('.q');
        if (!q || q.classList.contains('done')) return;
        q.classList.add('done');
        var ok = opt.dataset.ok === '1';
        opt.classList.add(ok ? 'correct' : 'wrong');
        if (!ok) q.querySelectorAll('.opt').forEach(function (o) {
          if (o.dataset.ok === '1') o.classList.add('correct');
        });
        opt.blur();
      });
    });
  }

  /* Ein <video> zeigt im Ausdruck nichts – Chrome druckt weder das laufende Bild
     noch zuverlaessig das Standbild. Deshalb bekommt jeder Film ein zweites,
     am Bildschirm unsichtbares <img> mit demselben Standbild; im Druck wird der
     Film ausgeblendet und dieses Bild gezeigt (Regeln in cards.css). So bleibt
     auf dem Blatt das Motiv stehen und darunter die Quellenzeile mit der URL. */
  function filmStandbild(){
    doc.querySelectorAll('.film video[poster]').forEach(function (v) {
      if (v.parentNode.querySelector('img.filmdruck')) return;
      var img = doc.createElement('img');
      img.className = 'filmdruck';
      img.src = v.getAttribute('poster');
      img.alt = 'Standbild aus dem Film';
      img.setAttribute('aria-hidden', 'true');
      v.parentNode.insertBefore(img, v.nextSibling);
    });
  }

  function pluginList() {
    var p = [];
    if (global.RevealNotes)  p.push(global.RevealNotes);
    if (global.RevealZoom)   p.push(global.RevealZoom);     // Alt+Klick-Zoom (Laptop)
    if (global.Smallcontrol) p.push(global.Smallcontrol);   // kleine Navigationspfeile
    if (global.RevealTouchControls) p.push(global.RevealTouchControls);    // Stift/Lupe/Pause/Übersicht/Vollbild
    if (global.RevealGlossary) p.push(global.RevealGlossary);             // Fachbegriff-Tooltips
    if (global.RevealSequence) p.push(global.RevealSequence);         // Ablauf & Verlauf (Schiene / Zeitachse)
    if (global.RevealCycle)    p.push(global.RevealCycle);               // Kreisläufe & Regelkreise (rundes Gegenstück zu Sequence)
    if (global.RevealQuiz)     p.push(global.RevealQuiz);                 // Quiz (Single-Choice, Mehrfach, Wahr/Falsch, Reihenfolge)
    if (global.RevealTermCluster) p.push(global.RevealTermCluster);       // Wortwolke / Advance Organizer
    if (global.RevealQuizGrid) p.push(global.RevealQuizGrid);             // Punktetafel-Quiz (Kategorien × Punkte)
    if (global.RevealStepped)  p.push(global.RevealStepped);              // Zitate/Definitionen Satz für Satz
    if (global.RevealPacer)    p.push(global.RevealPacer);                // Fahrplan-Anzeige für Vorträge
    if (global.Verticator)     p.push(global.Verticator);                 // Punkte am rechten Rand: wie viele Unterfolien hängen an dieser Folie
    if (global.Multimodal)     p.push(global.Multimodal);                 // Abbildung antippen -> Lightbox in voller Aufloesung
    if (global.RevealHotspot)  p.push(global.RevealHotspot);              // Abbildung beschriften: Marker auf dem Bild, Blase mit Erklaerung
    if (global.Chapters)       p.push(global.Chapters);                 // Kapitelanzeige: Segmentbalken + "Teil 2/4 · 5/13"; bringt sein CSS selbst mit
    if (global.Tagteam)        p.push(global.Tagteam);                    // Teilmengen ueber URL: ?t=... blendet nicht genannte Sektionen aus
    return p;
  }

  var CardsDeck = {
    init: function (overrides) {
      var cfg = {
        width: 1280, height: 720, margin: 0,
        center: false, hash: true, controls: true, progress: true,
        slideNumber: 'c/t', transition: 'slide', transitionSpeed: 'fast',
        pdfSeparateFragments: false,   // PDF: jede Folie EINE Seite mit allen Fragmenten (statt eine Seite je Fragment-Schritt)
        /* Glossar: im Ausdruck gibt es kein Daraufzeigen, deshalb haengt das
           Plugin hinten alphabetische Glossarseiten an - deutsche Beschriftung. */
        glossary: {
          printTitle: 'Glossar',
          printContinued: ' (Fortsetzung)'
        },
        /* Verticator: die Farbe wird hier fest gesetzt, weil das Plugin sonst aus dem
           Theme raten würde – es schaut auf h1, und den gibt es nur auf der Titelfolie.
           inversecolor greift auf dunklen Folien (Trenner, Zusammenfassung). */
        verticator: {
          color: '#2C4A6E',
          inversecolor: '#FFFFFF',
          position: 'right',
          offset: '0.6vmin',
          scale: 1.15,
          clickable: true,
          tooltip: false
        },
        /* Multimodal: Lightbox fuer Abbildungen. Alles im Hausstil - der
           Vorhang in der Textfarbe statt Schwarz, Rundung wie bei .card,
           heller Rand in der Linienfarbe. Bild bekommt keine Polsterung
           (das Motiv soll den Rahmen fuellen); Ausnahmen setzen an der
           einzelnen Abbildung data-modal-padding. */
        multimodal: {
          csspath: BASE + 'plugin/multimodal/multimodal.css' + VER,
          overlaycolor: 'rgba(11, 24, 24, 0.62)',
          background: { media: '#FFFFFF', html: '#FFFFFF', iframe: '#FFFFFF' },
          padding:    { media: '0', html: '1em', iframe: '0' },
          bordercolor: '#E7EBEF',
          borderwidth: '1px',
          radius: '20px',
          shadow: '0 18px 48px rgba(11, 24, 24, .30)',
          speed: 260,
          zoom: true,
          zoomfrom: 0.94
        },
        /* Hotspot: Marker auf einer Abbildung, die beim Antippen Bezeichnung und
           Erklaerung zeigen. Die Voreinstellungen des Plugins sind bereits die
           Hausfarben; hier stehen nur die Werte, die davon abweichen. Der Vollbild-
           Knopf bleibt an - er nutzt denselben Dialog wie Multimodal, die beiden
           beissen sich also nicht. Im Druck nummeriert das Plugin von selbst und
           haengt die Legende auf ein eigenes Blatt. */
        hotspot: {
          width: 820,
          numbers: false,
          maximize: true,
          author: false,
          strings: { maximize: 'Abbildung groß zeigen', close: 'Schließen' }
        },
        /* Tagteam: vorerst nur geladen, ohne Gruppen. Ohne URL-Parameter und
           ohne data-tag/data-name an den Sektionen zeigt es alles - die
           Vortraege verhalten sich also unveraendert. */
        tagteam: {
          debug: false,
          mandatorygroup: false
        },
        plugins: pluginList()
      };
      if (overrides) for (var k in overrides) cfg[k] = overrides[k];

      addCSS(BASE + 'plugin/verticator/verticator.css');
      addAllJS([
        [BASE + 'plugin/verticator/verticator.js', 'Verticator']
      ], function () {
        cfg.plugins = pluginList();          // erst jetzt, damit die nachgeladenen dabei sind
        global.Reveal.initialize(cfg).then(function () { wireQuiz(); filmStandbild(); });
      });
    }
  };

  global.CardsDeck = CardsDeck;
})(window);
