/*!
 * reveal.js-touchcontrols 1.4.0
 * On-screen controls for touch displays / smartboards.
 * Bildschirm-Bedienung für Touch-Displays / Smartboards.
 * Buttons: pen · whiteboard · focus · timer · pause · overview · fullscreen
 * Focus: tap a spot to dim its surroundings, tap again to zoom in, drag to move.
 * Pen marks stay on their slide for the whole session (keepAnnotations).
 * The last pen stage draws in a fading ink that clears itself (fadePen).
 * @author  Florian Loyns
 * @license MIT
 * Companion to Smallcontrol by Martijn De Jongh (Martino).
 * Docs & options: see README.
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.RevealTouchControls = factory());
}(this, (function () {
  'use strict';

  function svg(p){ return '<svg viewBox="0 0 24 24">' + p + '</svg>'; }
  var ICON = {
    pen:  svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
    board: svg('<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M7 10.5c1.7-2 3.3-2 5 0s3.3 2 5 0"/><path d="M8 21l2-4"/><path d="M16 21l-2-4"/>'),
    zoom: svg('<circle cx="11" cy="11" r="7"/><path d="M20.5 20.5l-4-4"/><circle cx="11" cy="11" r="2.3" fill="currentColor" stroke="none"/>'),
    timer: svg('<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5v3.5l2.6 1.6"/><path d="M9.5 2.5h5"/><path d="M12 2.5v3"/>'),
    pause: svg('<path d="M9 5v14"/><path d="M15 5v14"/>'),
    grid: svg('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'),
    full: svg('<path d="M4 9V4h5"/><path d="M20 9V4h-5"/><path d="M4 15v5h5"/><path d="M20 15v5h-5"/>')
  };

  function penCursor(color){
    return "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='"
      + encodeURIComponent(color) + "' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 20h9'/%3E%3Cpath d='M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z'/%3E%3C/svg%3E\") 4 24, crosshair";
  }

  function injectCSS(o){
    if (document.getElementById('touchcontrols-css')) return;
    var pos = (o.side === 'right') ? 'right:18px' : 'left:18px';
    var css =
      ".reveal .touchcontrols{position:fixed;" + pos + ";bottom:" + o.bottom + "px;z-index:60;display:flex;align-items:center;gap:8px;transition:opacity .3s ease}"
    + ".reveal .touchcontrols.idle{opacity:0;pointer-events:none}"
    + ".reveal .touchcontrols button{width:36px;height:36px;padding:0;cursor:pointer;border-radius:9px;background:transparent;border:1.5px solid " + o.accent + ";color:" + o.accent + ";display:flex;align-items:center;justify-content:center;transition:.14s}"
    + ".reveal .touchcontrols button:hover{background:" + o.hover + "}"
    + ".reveal .touchcontrols button:active{transform:translateY(1px)}"
    + ".reveal .touchcontrols button.active{background:" + o.accent + ";color:#fff}"
    + ".reveal.has-dark-background .touchcontrols button{border-color:#fff;color:#fff}"
    + ".reveal.has-dark-background .touchcontrols button:hover{background:rgba(255,255,255,.15)}"
    + ".reveal.has-dark-background .touchcontrols button.active{background:#fff;color:" + o.accent + "}"
    /* Whiteboard an: Leiste immer in Akzentfarbe, auch wenn die Folie dahinter dunkel ist */
    + ".reveal.has-dark-background .touchcontrols.wb-on button{border-color:" + o.accent + ";color:" + o.accent + "}"
    + ".reveal.has-dark-background .touchcontrols.wb-on button:hover{background:" + o.hover + "}"
    + ".reveal.has-dark-background .touchcontrols.wb-on button.active{background:" + o.accent + ";color:#fff}"
    + ".reveal .touchcontrols button svg{width:19px;height:19px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}"
    + ".reveal .touchcontrols-annot{position:fixed;inset:0;z-index:45;pointer-events:none;touch-action:none}"
    + ".reveal .touchcontrols-fade{position:fixed;inset:0;z-index:47;pointer-events:none;touch-action:none}"
    + ".reveal .touchcontrols-annot.on{cursor:" + penCursor(o.inks[0]) + "}"
    + ".reveal .touchcontrols-board{position:fixed;inset:0;z-index:44;background:#fff;display:none}"
    + ".reveal .touchcontrols-board.on{display:block}"
    /* Spotlight: runder Ausschnitt, alles ausserhalb per Schlagschatten abgedunkelt (weiche Kante durch Blur) */
    + ".reveal .touchcontrols-spot{position:fixed;z-index:46;border-radius:50%;pointer-events:none;transform:translate(-50%,-50%);box-shadow:0 0 40px 9999px rgba(0,0,0," + o.spotDim + ");opacity:0;visibility:hidden;transition:opacity .22s ease,visibility .22s ease,box-shadow .4s ease}"
    + ".reveal .touchcontrols-spot.on{opacity:1;visibility:visible}"
    + ".reveal .touchcontrols-spot.zoomed{box-shadow:0 0 40px 9999px rgba(0,0,0," + o.spotDimZoom + ")}"
    /* Im Fokusmodus gehören alle Berührungen uns – sonst reisst der Browser die Geste
       für eigenes Scrollen/Zoomen an sich und bricht sie mit pointercancel ab. */
    + ".reveal.tc-focus,.reveal.tc-focus .slides{touch-action:none !important}"
    + ".reveal .touchcontrols-timer{position:fixed;" + pos + ";bottom:" + (o.bottom + 48) + "px;z-index:60;display:none;padding:6px 16px;border-radius:12px;background:" + o.accent + ";color:#fff;font-family:Inter,system-ui,-apple-system,sans-serif;font-size:24px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:.5px}"
    + ".reveal .touchcontrols-timer.on{display:block}"
    + ".reveal .touchcontrols-timer.done{background:#C0392B;animation:tc-pulse 1s ease-in-out infinite}"
    + "@keyframes tc-pulse{0%,100%{opacity:1}50%{opacity:.35}}"
    + ".reveal .controls{z-index:50}"
    + "@media print{.reveal .touchcontrols,.reveal .touchcontrols-annot,.reveal .touchcontrols-fade,.reveal .touchcontrols-board,.reveal .touchcontrols-timer,.reveal .touchcontrols-spot{display:none !important}}";
    var s = document.createElement('style');
    s.id = 'touchcontrols-css'; s.textContent = css;
    document.head.appendChild(s);
  }

  function toggleFullscreen(){
    var d = document, el = d.documentElement;
    if (!d.fullscreenElement){ (el.requestFullscreen || el.webkitRequestFullscreen || function(){}).call(el); }
    else { (d.exitFullscreen || d.webkitExitFullscreen || function(){}).call(d); }
  }

  var Plugin = {
    id: 'touchcontrols',
    init: function (deck) {
      var d = document;
      if (d.querySelector('.touchcontrols')) return;
      var host = deck.getRevealElement ? deck.getRevealElement() : d.body;

      var c = deck.getConfig().touchcontrols || {};
      var o = {
        side: c.side || 'left',
        bottom: (c.bottom != null) ? c.bottom : 32,
        accent: c.accent || '#2C4A6E',
        hover: c.hover || 'rgba(44,74,110,.10)',
        inks: (c.inks && c.inks.length) ? c.inks : ['#D14A4A', '#2B6CB0'],
        penWidth: c.penWidth || 4,
        buttons: (c.buttons && c.buttons.length) ? c.buttons : ['pen','whiteboard','zoom','timer','pause','overview','fullscreen'],
        timerMinutes: (c.timerMinutes && c.timerMinutes.length) ? c.timerMinutes : [5, 10, 15],
        autohide: (c.autohide != null) ? c.autohide : true,
        autohideDelay: c.autohideDelay || 3500,
        /* Fokus/Lupe: 'both' = erst abdunkeln, dann heranzoomen · 'spot' = nur abdunkeln · 'zoom' = nur heranzoomen */
        lupeMode: c.lupeMode || 'both',
        spotRadius: (c.spotRadius != null) ? c.spotRadius : 120,
        spotDim: (c.spotDim != null) ? c.spotDim : 0.55,
        zoomScale: c.zoomScale || 2,
        /* Markierungen beim Folienwechsel behalten statt loeschen */
        keepAnnotations: (c.keepAnnotations != null) ? c.keepAnnotations : true,
        /* Fluechtiger Stift: eine weitere Stufe am Stiftknopf, deren Striche
           von selbst verblassen - zum Zeigen im Reden, ohne Aufraeumen */
        fadePen: (c.fadePen != null) ? c.fadePen : true,
        fadeInk: c.fadeInk || '#E5484D',
        fadeMs: c.fadeMs || 1800
      };
      /* In Stufe 2 dunkler es weniger ab – die Vergrösserung fokussiert schon selbst */
      o.spotDimZoom = (c.spotDimZoom != null) ? c.spotDimZoom : +(o.spotDim * 0.64).toFixed(2);
      injectCSS(o);

      var bar = d.createElement('div');
      bar.className = 'touchcontrols';
      bar.setAttribute('aria-label', 'Steuerung');
      bar.addEventListener('contextmenu', function(ev){ ev.preventDefault(); });   // Langdruck ohne Kontextmenü

      /* ---- Auto-Ausblenden bei Inaktivität ---- */
      var idleTimer = null;
      function activity(){
        bar.classList.remove('idle');
        if (!o.autohide) return;
        clearTimeout(idleTimer);
        idleTimer = setTimeout(function(){
          if (pen.on || zoom.on || zoom.armed || wb.on) return;   // im Stift-/Zoom-/Whiteboard-Modus sichtbar lassen
          bar.classList.add('idle');
        }, o.autohideDelay);
      }

      /* ---- Stift: Annotation, zyklische Farben, Langdruck = Folie löschen ---- */
      var pen = { on:false, canvas:null, ctx:null, drawing:false }, penBtn = null, longPressed = false;
      var currentInk = o.inks[0], penState = -1;   // -1 = aus, 0..n-1 Farbe, n = fluechtig
      /* Fluechtiger Stift: eigene Flaeche, damit die bleibenden Markierungen
         nicht mitverblassen. Sie nimmt keine Eingaben entgegen - gezeichnet
         wird weiter auf der Annot-Flaeche, gemalt nur woanders hin.
         Statt die Flaeche Bild um Bild abzudunkeln (das bleibt bei kleinen
         Werten stehen, weil 8 Bit Deckkraft nicht feiner rechnen koennen),
         merken wir uns die Striche und zeichnen sie jedes Bild neu - mit der
         Deckkraft, die zu ihrem Alter passt. Ein Strich verblasst als Ganzes
         und erst, wenn er fertig ist: sonst waere der Anfang einer
         Unterstreichung schon weg, waehrend die Hand noch am Ende malt. */
      var fade = { canvas:null, ctx:null, raf:null, striche:[], offen:null };
      function fluechtig(){ return o.fadePen && penState === o.inks.length; }
      function jetztMs(){
        return (window.performance && performance.now) ? performance.now() : Date.now();
      }
      function ensureFade(){
        if (fade.canvas) return;
        var cv = d.createElement('canvas');
        cv.className = 'touchcontrols-fade';
        fade.ctx = cv.getContext('2d');
        fade.canvas = cv;
        sizeFade();
        window.addEventListener('resize', sizeFade);
        host.appendChild(cv);
      }
      function sizeFade(){
        if (!fade.canvas) return;
        var dpr = window.devicePixelRatio || 1;
        fade.canvas.width  = Math.round(window.innerWidth  * dpr);
        fade.canvas.height = Math.round(window.innerHeight * dpr);
        fade.canvas.style.width  = window.innerWidth  + 'px';
        fade.canvas.style.height = window.innerHeight + 'px';
        fade.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      function wischFade(){
        if (!fade.ctx) return;
        var x = fade.ctx;
        x.save(); x.setTransform(1, 0, 0, 1, 0, 0);
        x.clearRect(0, 0, fade.canvas.width, fade.canvas.height);
        x.restore();
      }
      function clearFade(){
        fade.striche = []; fade.offen = null;
        wischFade();
        if (fade.raf){ cancelAnimationFrame(fade.raf); fade.raf = null; }
      }
      /* Deckkraft nach Alter: erst eine Weile voll stehen bleiben, dann weich
         auslaufen. Ein noch offener Strich (die Hand malt) bleibt voll. */
      function deckkraft(st, ts){
        if (st.ende == null) return 1;
        var halt = o.fadeMs * 0.4, alt = ts - st.ende;
        if (alt <= halt) return 1;
        var p = (alt - halt) / (o.fadeMs - halt);
        if (p >= 1) return 0;
        return (1 - p) * (1 - p);            // weich auslaufen statt linear
      }
      function fadeStep(ts){
        if (!fade.ctx){ fade.raf = null; return; }
        var x = fade.ctx, lebt = 0;
        wischFade();
        x.save();
        x.lineWidth = o.penWidth; x.lineCap = 'round'; x.lineJoin = 'round';
        x.strokeStyle = o.fadeInk;
        for (var i = 0; i < fade.striche.length; i++){
          var st = fade.striche[i], a = deckkraft(st, ts);
          if (a <= 0.01) continue;
          lebt++;
          x.globalAlpha = a;
          x.beginPath();
          x.moveTo(st.p[0], st.p[1]);
          if (st.p.length === 2) x.lineTo(st.p[0] + 0.01, st.p[1]);   // blosses Tippen: Punkt
          for (var k = 2; k < st.p.length; k += 2) x.lineTo(st.p[k], st.p[k + 1]);
          x.stroke();
        }
        x.restore();
        if (!lebt){ clearFade(); return; }
        if (fade.striche.length > 40) fade.striche = fade.striche.slice(-20);
        fade.raf = requestAnimationFrame(fadeStep);
      }
      function fadeStart(px, py){
        ensureFade();
        fade.offen = { p:[px, py], ende:null };
        fade.striche.push(fade.offen);
        if (!fade.raf) fade.raf = requestAnimationFrame(fadeStep);
      }
      function fadeZu(px, py){ if (fade.offen) fade.offen.p.push(px, py); }
      function fadeEnde(){
        if (fade.offen){ fade.offen.ende = jetztMs(); fade.offen = null; }
        if (!fade.raf && fade.ctx) fade.raf = requestAnimationFrame(fadeStep);
      }
      var lastX = 0, lastY = 0, activePtr = null;  // ein Finger/Stift zeichnet, der Rest wird ignoriert

      /* Markierungen je Folie merken (keepAnnotations). Gespeichert wird nur der
         bemalte Ausschnitt, und seine Lage als Anteil der Flaeche - so passt der
         Stand auch nach einem Fenster- oder Aufloesungswechsel wieder. Alles nur
         im Arbeitsspeicher: Neu laden beginnt mit leeren Folien. */
      var annots = (typeof Map === 'function') ? new Map() : null;
      var mark = null;                              // bemalter Bereich der aktuellen Folie, in CSS-Pixeln
      function markPoint(px, py){
        var rr = o.penWidth + 2;
        if (!mark) mark = { x1:px - rr, y1:py - rr, x2:px + rr, y2:py + rr };
        else {
          if (px - rr < mark.x1) mark.x1 = px - rr;
          if (py - rr < mark.y1) mark.y1 = py - rr;
          if (px + rr > mark.x2) mark.x2 = px + rr;
          if (py + rr > mark.y2) mark.y2 = py + rr;
        }
      }
      function snapshot(){
        if (!mark || !pen.canvas) return null;
        var dpr = window.devicePixelRatio || 1, W = pen.canvas.width, H = pen.canvas.height;
        var x1 = Math.max(0, Math.floor(mark.x1 * dpr)), y1 = Math.max(0, Math.floor(mark.y1 * dpr));
        var x2 = Math.min(W, Math.ceil(mark.x2 * dpr)), y2 = Math.min(H, Math.ceil(mark.y2 * dpr));
        if (x2 <= x1 || y2 <= y1) return null;
        var cv = d.createElement('canvas');
        cv.width = x2 - x1; cv.height = y2 - y1;
        cv.getContext('2d').drawImage(pen.canvas, x1, y1, cv.width, cv.height, 0, 0, cv.width, cv.height);
        return { cv:cv, x:x1 / W, y:y1 / H, w:cv.width / W, h:cv.height / H };
      }
      function paint(rec){
        clearCanvas();
        if (!rec || !pen.ctx) return;
        var x = pen.ctx, W = pen.canvas.width, H = pen.canvas.height, dpr = window.devicePixelRatio || 1;
        x.save(); x.setTransform(1, 0, 0, 1, 0, 0);
        x.drawImage(rec.cv, rec.x * W, rec.y * H, rec.w * W, rec.h * H);
        x.restore();
        mark = { x1:rec.x * W / dpr, y1:rec.y * H / dpr,
                 x2:(rec.x + rec.w) * W / dpr, y2:(rec.y + rec.h) * H / dpr };
      }
      function saveAnnot(sec){
        if (!annots || !o.keepAnnotations || !sec) return;
        var rec = snapshot();
        if (rec) annots.set(sec, rec); else annots['delete'](sec);
      }
      function loadAnnot(sec){
        paint((annots && o.keepAnnotations && sec) ? annots.get(sec) : null);
      }
      function forget(sec){ if (annots && sec) annots['delete'](sec); }
      function hier(){ return deck.getCurrentSlide ? deck.getCurrentSlide() : null; }

      function sizeCanvas(){
        var cv = pen.canvas, dpr = window.devicePixelRatio || 1;
        var alt = (cv.width && cv.height) ? snapshot() : null;   // Stand retten, das Setzen der Groesse loescht
        cv.width  = Math.round(window.innerWidth  * dpr);
        cv.height = Math.round(window.innerHeight * dpr);
        cv.style.width  = window.innerWidth  + 'px';   // CSS-Größe explizit: Canvas streckt sich
        cv.style.height = window.innerHeight + 'px';   // als ersetztes Element nicht über inset:0
        pen.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);    // in CSS-Pixeln zeichnen, scharf auf HiDPI
        if (alt) paint(alt);                            // und wieder auftragen, auf die neue Groesse skaliert
      }
      function inkStyle(x){
        x.strokeStyle = currentInk; x.lineWidth = o.penWidth; x.lineCap = 'round'; x.lineJoin = 'round';
      }
      function ensureCanvas(){
        if (pen.canvas) return;
        var cv = d.createElement('canvas');
        cv.className = 'touchcontrols-annot';
        pen.ctx = cv.getContext('2d');
        pen.canvas = cv;
        sizeCanvas();
        cv.addEventListener('pointerdown', function(e){
          if (!pen.on || !e.isPrimary || activePtr !== null) return;   // Handballen/zweiter Finger zeichnet nicht
          activePtr = e.pointerId;
          if (cv.setPointerCapture){ try { cv.setPointerCapture(e.pointerId); } catch(_){} }
          pen.drawing = true; lastX = e.clientX; lastY = e.clientY;
          if (fluechtig()){
            fadeStart(lastX, lastY);                 // wird jedes Bild neu gezeichnet
          } else {
            markPoint(lastX, lastY);
            var x = pen.ctx; inkStyle(x);
            x.beginPath(); x.moveTo(lastX, lastY); x.lineTo(lastX + 0.01, lastY); x.stroke();   // Punkt bei blossem Tippen
          }
          e.preventDefault(); e.stopPropagation();
        });
        cv.addEventListener('pointermove', function(e){
          if (!pen.drawing || e.pointerId !== activePtr) return;
          var evs = (e.getCoalescedEvents && e.getCoalescedEvents()) || [];
          if (!evs.length) evs = [e];
          if (fluechtig()){
            for (var j = 0; j < evs.length; j++){
              lastX = evs[j].clientX; lastY = evs[j].clientY;
              fadeZu(lastX, lastY);
            }
          } else {
            var x = pen.ctx; inkStyle(x);
            x.beginPath(); x.moveTo(lastX, lastY);
            for (var i = 0; i < evs.length; i++){     // nur die neuen Segmente zeichnen
              x.lineTo(evs[i].clientX, evs[i].clientY);
              lastX = evs[i].clientX; lastY = evs[i].clientY;
              markPoint(lastX, lastY);
            }
            x.stroke();
          }
          e.preventDefault();
        });
        function endStroke(e){
          if (e.pointerId !== activePtr) return;
          pen.drawing = false; activePtr = null;
          if (fluechtig()) fadeEnde();               // ab jetzt laeuft die Uhr
        }
        cv.addEventListener('pointerup', endStroke);
        cv.addEventListener('pointercancel', endStroke);   // vom System abgebrochene Gesten sauber beenden
        cv.addEventListener('contextmenu', function(e){ e.preventDefault(); });
        window.addEventListener('resize', sizeCanvas);
        host.appendChild(cv);
      }
      /* clearCanvas wischt nur die Flaeche, clearAnnot wischt sie und vergisst
         den Stand der Folie - sonst kaeme das Geloeschte beim Zurueckblaettern
         wieder zum Vorschein. */
      function clearCanvas(){
        if (!pen.ctx) return;
        var x = pen.ctx;
        x.save(); x.setTransform(1, 0, 0, 1, 0, 0);
        x.clearRect(0, 0, pen.canvas.width, pen.canvas.height);
        x.restore();
        mark = null;
      }
      function clearAnnot(sec){
        clearCanvas();
        clearFade();                    // Langdruck raeumt die Folie ganz
        forget(sec || hier());
      }
      function applyPen(){
        ensureCanvas();
        if (penState < 0){
          pen.on = false;
          penBtn.style.borderColor = ''; penBtn.style.color = '';
        } else if (fluechtig()){
          pen.on = true; currentInk = o.fadeInk;
          ensureFade();
          penBtn.style.borderColor = currentInk; penBtn.style.color = currentInk;
          penBtn.style.borderStyle = 'dashed';        // gestrichelt = fluechtig
        } else {
          pen.on = true; currentInk = o.inks[penState];
          penBtn.style.borderColor = currentInk; penBtn.style.color = currentInk;   // Button zeigt aktive Farbe
          penBtn.style.borderStyle = '';
        }
        if (penState < 0) penBtn.style.borderStyle = '';
        pen.canvas.style.pointerEvents = pen.on ? 'auto' : 'none';
        pen.canvas.classList.toggle('on', pen.on);
        pen.canvas.style.cursor = pen.on ? penCursor(currentInk) : '';
        activity();
      }
      function penTap(){
        if (zoom.on || zoom.armed) resetZoom();           // Fokus und Stift schliessen sich aus
        penState = penState + 1;
        var letzte = o.fadePen ? o.inks.length : o.inks.length - 1;
        if (penState > letzte) penState = -1;             // nach der letzten Stufe: aus
        if (!fluechtig()) clearFade();                    // beim Verlassen nichts stehen lassen
        applyPen();
      }

      /* ---- Whiteboard: weiße Fläche, Stift geht automatisch an ---- */
      var wb = { on:false, el:null }, wbBtn = null;
      function ensureBoard(){
        if (wb.el) return;
        var el = d.createElement('div');
        el.className = 'touchcontrols-board';
        host.appendChild(el);
        wb.el = el;
      }
      function setBoard(on, sec){
        ensureBoard();
        wb.on = on;
        wb.el.classList.toggle('on', on);
        bar.classList.toggle('wb-on', on);
        if (wbBtn) wbBtn.classList.toggle('active', on);
        if (on){
          if (penState < 0 || fluechtig()){ penState = 0; applyPen(); }   // auf der Tafel bleibt es stehen
        } else {
          clearAnnot(sec || hier());                        // Tafelbild verwerfen
          if (penState >= 0){ penState = -1; applyPen(); }
        }
        activity();
      }
      function board(){
        if (zoom.on || zoom.armed) resetZoom();           // Fokus und Whiteboard schliessen sich aus
        setBoard(!wb.on);
      }

      /* ---- Timer: Tippen schaltet die Stufen durch, Countdown gut sichtbar ---- */
      var timer = { idx:-1, left:0, iv:null, chip:null, done:false }, timerBtn = null;
      function two(n){ return (n < 10 ? '0' : '') + n; }
      function ensureChip(){
        if (timer.chip) return;
        var el = d.createElement('div');
        el.className = 'touchcontrols-timer';
        host.appendChild(el);
        timer.chip = el;
      }
      function paintTimer(){
        ensureChip();
        if (timer.idx < 0){
          timer.chip.classList.remove('on', 'done');
          if (timerBtn) timerBtn.classList.remove('active');
          return;
        }
        timer.chip.textContent = Math.floor(timer.left / 60) + ':' + two(timer.left % 60);
        timer.chip.classList.add('on');
        timer.chip.classList.toggle('done', timer.done);
        if (timerBtn) timerBtn.classList.add('active');
      }
      function stopTimer(){
        if (timer.iv){ clearInterval(timer.iv); timer.iv = null; }
        timer.idx = -1; timer.left = 0; timer.done = false;
        paintTimer();
      }
      function timerTap(){
        activity();
        if (timer.done){ stopTimer(); return; }              // abgelaufen: Tippen räumt auf
        timer.idx = timer.idx + 1;
        if (timer.idx >= o.timerMinutes.length){ stopTimer(); return; }   // nach letzter Stufe: aus
        timer.left = Math.round(o.timerMinutes[timer.idx] * 60);
        if (!timer.iv){
          timer.iv = setInterval(function(){
            if (timer.left > 0) timer.left = timer.left - 1;
            if (timer.left <= 0 && !timer.done){
              timer.done = true;
              clearInterval(timer.iv); timer.iv = null;
            }
            paintTimer();
          }, 1000);
        }
        paintTimer();
      }

      /* ---- Fokus (Lupe): Button antippen, dann Stelle antippen.
             Stufe 1  Spotlight – Umgebung abgedunkelt, Kontext bleibt sichtbar, Kreis lässt sich ziehen
             Stufe 2  zusätzlich heranzoomen – der markierte Punkt bleibt dabei an Ort und Stelle
             Stufe 3  zurück
             lupeMode: 'both' (Standard) · 'spot' (nur abdunkeln) · 'zoom' (nur heranzoomen) ---- */
      var zoom = { armed:false, on:false, el:null, stage:0, spot:null, x:0, y:0 }, lupeBtn = null;
      var drag = { active:false, moved:false, x:0, y:0, id:null };
      var pts = {}, pinch = { active:false, live:false, d0:0, r0:0 };   // zwei Finger = Kreis grösser/kleiner
      var radius = o.spotRadius;
      var SKIP = '.touchcontrols, .controls';   // Leiste und reveal-Pfeile bleiben bedienbar

      function setRadius(r){
        radius = Math.max(40, Math.min(420, r));
        if (zoom.spot) zoom.spot.style.width = zoom.spot.style.height = (radius * 2) + 'px';
      }
      function pinchDist(){
        var k = Object.keys(pts);
        if (k.length < 2) return 0;
        var a = pts[k[0]], b = pts[k[1]];
        return Math.sqrt((b.x-a.x)*(b.x-a.x) + (b.y-a.y)*(b.y-a.y));
      }

      function targetEl(){ var s = deck.getCurrentSlide(); return s ? (s.querySelector('.cardslide') || s) : null; }

      function ensureSpot(){
        if (zoom.spot) return;
        var el = d.createElement('div');
        el.className = 'touchcontrols-spot';
        host.appendChild(el);
        zoom.spot = el;
      }
      function moveSpot(x, y){
        ensureSpot();
        zoom.x = x; zoom.y = y;
        zoom.spot.style.left = x + 'px';
        zoom.spot.style.top  = y + 'px';
        zoom.spot.style.width = zoom.spot.style.height = (radius * 2) + 'px';
      }
      /* Zoomt auf einen Bildschirmpunkt. transformOrigin = genau dieser Punkt, deshalb
         bleibt er beim Skalieren an derselben Bildschirmposition – der Spotlight passt weiter. */
      function applyZoom(x, y){
        var r = zoom.el.getBoundingClientRect();
        var px = Math.max(0, Math.min(100, ((x - r.left)/r.width)*100));
        var py = Math.max(0, Math.min(100, ((y - r.top)/r.height)*100));
        zoom.el.style.willChange = 'transform';
        zoom.el.style.transition = 'transform .42s cubic-bezier(.22,.61,.36,1)';
        zoom.el.style.transformOrigin = px + '% ' + py + '%';
        zoom.el.style.transform = 'scale(' + o.zoomScale + ')';
      }
      function resetZoom(){
        if (zoom.el){ zoom.el.style.transform = ''; }   // Origin bleibt -> weiches Rauszoomen
        if (zoom.spot) zoom.spot.classList.remove('on', 'zoomed');
        zoom.on = false; zoom.armed = false; zoom.el = null; zoom.stage = 0;
        drag.active = false; drag.moved = false;
        pts = {}; pinch.active = false;
        radius = o.spotRadius;                          // nächster Aufruf startet wieder normal
        host.classList.remove('tc-focus');
        if (lupeBtn) lupeBtn.classList.remove('active');
        d.removeEventListener('pointerdown', onDown, true);
        d.removeEventListener('pointermove', onMove, true);
        d.removeEventListener('pointerup', onUp, true);
        d.removeEventListener('pointercancel', onCancel, true);
        d.removeEventListener('click', swallow, true);
        d.removeEventListener('keydown', onKey, true);
        d.removeEventListener('wheel', onWheel, { capture:true });
      }
      /* eine Stufe weiter */
      function advance(x, y){
        if (o.lupeMode === 'zoom'){                       // klassisches Verhalten
          if (zoom.stage === 0){ applyZoom(x, y); zoom.stage = 1; zoom.on = true; zoom.armed = false; }
          else resetZoom();
          return;
        }
        if (zoom.stage === 0){                            // Stufe 1: Spotlight
          moveSpot(x, y);
          ensureSpot(); zoom.spot.classList.add('on');
          zoom.stage = 1; zoom.on = true; zoom.armed = false;
          return;
        }
        if (zoom.stage === 1 && o.lupeMode === 'both'){   // Stufe 2: heranzoomen, auf den markierten Punkt
          applyZoom(zoom.x, zoom.y);
          zoom.spot.classList.add('zoomed');              // Abdunklung zurücknehmen, der Zoom fokussiert schon
          zoom.stage = 2;
          return;
        }
        resetZoom();
      }
      /* Tippen = Stufe weiter · Ziehen = Spotlight verschieben (nur Stufe 1, da bleibt der Kontext) */
      function onDown(ev){
        if (ev.target.closest && ev.target.closest(SKIP)) return;
        if (!zoom.el){ resetZoom(); return; }
        pts[ev.pointerId] = { x:ev.clientX, y:ev.clientY };
        if (Object.keys(pts).length === 2){              // zweiter Finger: ab jetzt Grösse statt Position
          pinch.active = true; pinch.live = false;       // wirkt erst ab echter Abstandsänderung
          pinch.d0 = pinchDist(); pinch.r0 = radius;
          drag.active = false;
        } else {
          drag.active = true; drag.moved = false;
          drag.x = ev.clientX; drag.y = ev.clientY; drag.id = ev.pointerId;
        }
        ev.preventDefault(); ev.stopPropagation();
      }
      function onMove(ev){
        if (pts[ev.pointerId]){ pts[ev.pointerId].x = ev.clientX; pts[ev.pointerId].y = ev.clientY; }
        if (pinch.active){
          var dNow = pinchDist();
          /* Erst ab 24 px Abstandsänderung skalieren: ein aufliegender Handballen
             liegt still und darf den Kreis nicht springen lassen. */
          if (!pinch.live && Math.abs(dNow - pinch.d0) > 24) pinch.live = true;
          if (pinch.live && pinch.d0 > 0 && dNow > 0) setRadius(pinch.r0 * (dNow / pinch.d0));
          ev.preventDefault(); ev.stopPropagation();
          return;
        }
        if (!drag.active || ev.pointerId !== drag.id) return;
        if (!drag.moved){
          var dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
          if (dx*dx + dy*dy < 100) return;                // erst ab ~10 px als Ziehen werten (Finger wackelt)
          drag.moved = true;
        }
        if (zoom.stage === 1 && o.lupeMode !== 'zoom') moveSpot(ev.clientX, ev.clientY);
        ev.preventDefault(); ev.stopPropagation();
      }
      function onUp(ev){
        delete pts[ev.pointerId];
        if (pinch.active){                                // Finger weg: Pinch beenden, kein Stufenwechsel
          if (Object.keys(pts).length < 2){ pinch.active = false; pinch.live = false; drag.active = false; }
          ev.preventDefault(); ev.stopPropagation();
          return;
        }
        if (!drag.active || ev.pointerId !== drag.id) return;
        drag.active = false;
        if (!drag.moved) advance(ev.clientX, ev.clientY);
        ev.preventDefault(); ev.stopPropagation();
      }
      /* Vom System abgebrochene Geste: nur aufräumen. Ein Abbruch ist keine Eingabe –
         früher hat er hier eine Stufe weitergeschaltet. */
      function onCancel(ev){
        delete pts[ev.pointerId];
        if (Object.keys(pts).length < 2){ pinch.active = false; pinch.live = false; }
        if (drag.id === ev.pointerId){ drag.active = false; drag.moved = false; }
      }
      /* Escape beendet den Fokus – und zwar bevor reveal daraus die Folienübersicht macht */
      function onKey(ev){
        if (ev.key !== 'Escape' && ev.key !== 'Esc') return;
        if (!zoom.on && !zoom.armed) return;
        ev.preventDefault(); ev.stopPropagation();
        resetZoom();
      }
      /* Mausrad ändert die Kreisgrösse (das Gegenstück zum Pinch am Board) */
      function onWheel(ev){
        if (!zoom.on && !zoom.armed) return;
        if (ev.target.closest && ev.target.closest(SKIP)) return;
        ev.preventDefault(); ev.stopPropagation();
        setRadius(radius - (ev.deltaY > 0 ? 14 : -14));
      }
      function swallow(ev){                               // reveal darf im Fokusmodus nicht blättern
        if (ev.target.closest && ev.target.closest(SKIP)) return;
        ev.preventDefault(); ev.stopPropagation();
      }
      function lupe(){
        activity();
        if (zoom.on || zoom.armed){ resetZoom(); return; }
        if (wb.on) setBoard(false);                       // auf weisser Tafel gibt es nichts abzudunkeln
        zoom.el = targetEl();
        if (!zoom.el) return;
        if (penState >= 0){ penState = -1; applyPen(); }  // Stift und Fokus schliessen sich aus
        zoom.armed = true; zoom.stage = 0; radius = o.spotRadius;
        host.classList.add('tc-focus');   // Berührungen gehören ab jetzt uns
        lupeBtn.classList.add('active');
        d.addEventListener('pointerdown', onDown, true);
        d.addEventListener('pointermove', onMove, true);
        d.addEventListener('pointerup', onUp, true);
        d.addEventListener('pointercancel', onCancel, true);
        d.addEventListener('click', swallow, true);
        d.addEventListener('keydown', onKey, true);
        d.addEventListener('wheel', onWheel, { capture:true, passive:false });
      }

      /* Neue Folie: Whiteboard zu, Zoom zurück, Timer läuft weiter. Die
         Markierungen der verlassenen Folie werden gesichert und die der neuen
         wieder aufgetragen (keepAnnotations:false loescht sie stattdessen). */
      if (deck.on) deck.on('slidechanged', function(ev){
        var vorher = (ev && ev.previousSlide) || null;
        var jetzt  = (ev && ev.currentSlide) || hier();
        if (wb.on) setBoard(false, vorher);       // Tafelbild gehoert zu keiner Folie
        else if (pen.canvas) saveAnnot(vorher);
        resetZoom();
        clearFade();
        if (pen.canvas) loadAnnot(jetzt);
      });
      /* Übersicht oder Pause: Fokus beenden. Sonst schluckt er die Tipps, mit denen
         man in der Übersicht eine Folie auswählt – egal ob per Button, Taste oder API. */
      if (deck.on){
        deck.on('overviewshown', function(){ if (zoom.on || zoom.armed) resetZoom(); });
        deck.on('paused',        function(){ if (zoom.on || zoom.armed) resetZoom(); });
      }

      function penTitle(){
        var t = 'Stift – markieren · lang drücken löscht die Folie';
        if (o.fadePen) t += ' · letzte Stufe: Striche verblassen von selbst';
        return t;
      }
      function lupeTitle(){
        if (o.lupeMode === 'zoom') return 'Lupe – Stelle antippen zum Zoomen';
        if (o.lupeMode === 'spot') return 'Fokus – Stelle antippen hebt sie hervor · ziehen bewegt den Kreis';
        return 'Fokus – Stelle antippen hebt sie hervor · nochmal tippen zoomt heran · ziehen bewegt den Kreis';
      }

      /* ---- Buttons aus der Konfiguration ---- */
      var ALL = {
        pen:        { ic:ICON.pen,   t:penTitle(), pen:true },
        whiteboard: { ic:ICON.board, t:'Whiteboard – weiße Fläche zum Schreiben', wb:true, fn:board },
        zoom:       { ic:ICON.zoom,  t:lupeTitle(), lupe:true, fn:lupe },
        timer:      { ic:ICON.timer, t:'Timer – Tippen wechselt ' + o.timerMinutes.join(' · ') + ' min, danach aus', tm:true, fn:timerTap },
        pause:      { ic:ICON.pause, t:'Pause – Bildschirm schwarz', fn:function(){ deck.togglePause(); } },
        overview:   { ic:ICON.grid,  t:'Folienübersicht', fn:function(){ deck.toggleOverview(); } },
        fullscreen: { ic:ICON.full,  t:'Vollbild', fn:toggleFullscreen }
      };
      var items = o.buttons.map(function(k){ return ALL[k]; }).filter(Boolean);

      items.forEach(function (item) {
        var b = d.createElement('button');
        b.type = 'button'; b.title = item.t; b.setAttribute('aria-label', item.t);
        b.innerHTML = item.ic;

        if (item.pen){
          penBtn = b;
          var lp = null;
          b.addEventListener('pointerdown', function(ev){
            ev.stopPropagation();
            longPressed = false;
            lp = setTimeout(function(){ longPressed = true; clearAnnot(); }, 550);   // Langdruck = löschen (auch aus dem Gedaechtnis)
          });
          var cancelLP = function(){ if (lp){ clearTimeout(lp); lp = null; } };
          b.addEventListener('pointerup', cancelLP);
          b.addEventListener('pointerleave', cancelLP);
          b.addEventListener('pointercancel', cancelLP);
          b.addEventListener('click', function(ev){
            ev.stopPropagation(); ev.preventDefault();
            if (longPressed){ longPressed = false; return; }   // nach Langdruck kein Umschalten
            penTap();
          });
        } else {
          if (item.lupe) lupeBtn = b;
          if (item.wb) wbBtn = b;
          if (item.tm) timerBtn = b;
          b.addEventListener('pointerdown', function(ev){ ev.stopPropagation(); });
          b.addEventListener('click', function(ev){ ev.stopPropagation(); ev.preventDefault(); item.fn(); });
        }
        bar.appendChild(b);
      });

      host.appendChild(bar);

      if (o.autohide){
        ['pointermove','pointerdown','keydown'].forEach(function(ev){ document.addEventListener(ev, activity, true); });
      }
      activity();
    }
  };

  return Plugin;
})));
