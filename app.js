/* Max Jeune Tracker — JavaScript du site (chargé par index.html). */

/* Listes déroulantes des gares (départ / destination).
   Script indépendant de la carte : il fonctionne même si la carte ou ses fonds ne se chargent pas.
   Le <select> caché garde la valeur (lu par le reste du code) ; un clic sur le champ ouvre la liste :
   recherche à la loupe en haut, puis les 20 gares les plus importantes, puis toutes les autres de A à Z. */
(() => {
  const $ = id => document.getElementById(id);
  const fold = t => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  const norm = s => fold(s).replace(/\(.*?\)/g, "").replace(/[-']/g, " ").replace(/\s+/g, " ").trim();
  const clean = n => n.replace(/\s*\(.*?\)/g, "").toLowerCase().replace(/(^|[\s-])\S/g, m => m.toUpperCase());
  const html = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const ALL_STATIONS = /\(toutes les gares\)/i;
  const disp = t => ALL_STATIONS.test(t) ? `${clean(t)} · toutes les gares` : clean(t);
  /* Une entrée = un nom ou une liste de noms préférés (le nom exact d'abord, sinon le premier qui commence par ce nom) */
  const TOP20 = ["PARIS", "LYON", ["MARSEILLE", "MARSEILLE ST CHARLES"], "LILLE", "BORDEAUX", "TOULOUSE", "NANTES", "STRASBOURG", "RENNES", "MONTPELLIER",
    "NICE", /CDG|ROISSY|CHARLES DE GAULLE/, "MARNE LA VALLEE", ["AVIGNON", "AVIGNON TGV"], ["AIX EN PROVENCE", "AIX EN PROVENCE TGV"], "TOURS", "DIJON", "LE MANS", "ANGERS", "GRENOBLE"];

  /* Entrées spéciales (« Toutes les destinations », « Toutes les gares de départ ») : affichées telles quelles, en tête de liste.
     L'invite « Choisissez une destination » (désactivée) n'apparaît pas dans la liste. */
  const special = o => o.value === "" || o.value === "*";
  const lab = o => special(o) ? o.text : disp(o.text);
  /* Options rangées : [entrée spéciale], 20 gares principales, puis le reste de A à Z */
  function orderedOptions(sel) {
    const opts = [...sel.options], head = opts.filter(o => special(o) && !o.disabled), rest = opts.filter(o => !special(o));
    const top = [];
    for (const k of TOP20) {
      const free = rest.filter(o => !top.includes(o)), ks = [].concat(k);
      const o = k instanceof RegExp ? free.find(o => k.test(norm(o.text)))
        : ks.map(k => free.find(o => norm(o.text) === k)).find(Boolean) || free.find(o => norm(o.text).startsWith(ks[0]));
      if (!o) continue;
      top.push(o);
      /* « Ville · toutes les gares » : ses gares suivent juste en dessous */
      if (ALL_STATIONS.test(o.text)) { const c = norm(o.text); top.push(...free.filter(s => s !== o && !ALL_STATIONS.test(s.text) && norm(s.text).startsWith(c + " ")).sort((a, b) => a.text.localeCompare(b.text))); }
    }
    const others = rest.filter(o => !top.includes(o)).sort((a, b) => disp(a.text).localeCompare(disp(b.text), "fr", { sensitivity: "base" }));
    return { head, top, others };
  }

  /* Gares favorites (étoile dans la liste) : gardées dans le navigateur, par nom de gare normalisé, communes au départ et à la destination */
  const FAV_KEY = "favGares";
  let FAV = []; try { FAV = JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch { }
  const isFav = o => FAV.includes(norm(o.text));
  function toggleFav(text) {
    const k = norm(text); FAV = FAV.includes(k) ? FAV.filter(x => x !== k) : [...FAV, k];
    try { localStorage.setItem(FAV_KEY, JSON.stringify(FAV)); } catch { }
  }

  const DD = { id: null, items: [], active: 0 };
  function syncPick(id) {
    const sel = $(id), btn = $(id + "-btn"), o = sel.selectedOptions[0];
    btn.disabled = sel.disabled;
    btn.querySelector(".ptxt").textContent = o ? lab(o) : "";
    btn.classList.toggle("empty", !!o?.disabled);
  }
  function ddRender() {
    const sel = $(DD.id), q = fold($("dd-q").value.trim()), { head, top, others } = orderedOptions(sel);
    const match = o => !q || fold(disp(o.text)).includes(q) || fold(o.text).includes(q);
    const star = o => special(o) ? "" : `<button type="button" class="dd-fav${isFav(o) ? " on" : ""}" tabindex="-1" aria-pressed="${isFav(o)}" title="${isFav(o) ? "Retirer des favoris" : "Ajouter aux favoris"}" aria-label="${isFav(o) ? "Retirer des favoris" : "Ajouter aux favoris"}"><svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z"/></svg></button>`;
    const item = o => `<li role="option" class="dd-item${o.value === sel.value ? " sel" : ""}" data-v="${html(o.value)}" aria-selected="${o.value === sel.value}"><span class="dd-txt">${html(lab(o))}</span>${star(o)}</li>`;
    /* Favoris : en tête de liste (sans recherche), et retirés des autres sections pour ne pas apparaître deux fois */
    const f = q ? [] : [...top, ...others].filter(isFav).sort((a, b) => lab(a).localeCompare(lab(b), "fr", { sensitivity: "base" }));
    const t = top.filter(o => match(o) && !f.includes(o)), r = others.filter(o => match(o) && !f.includes(o)), hd = q ? [] : head;
    DD.items = [...hd, ...f, ...t, ...r];
    $("dd-list").innerHTML = hd.map(item).join("")
      + (f.length ? `<li class="dd-h" role="presentation">★ Favoris</li>${f.map(item).join("")}` : "")
      + (t.length ? `<li class="dd-h" role="presentation">Gares principales</li>${t.map(item).join("")}` : "")
      + (r.length ? `<li class="dd-h" role="presentation">${q ? "Autres gares" : "Toutes les gares (A → Z)"}</li>${r.map(item).join("")}` : "")
      || `<li class="dd-empty">${sel.options.length ? "Aucune gare trouvée" : "Chargement des gares…"}</li>`;
    const cur = sel.selectedOptions[0];
    $("dd-title").textContent = cur && !cur.disabled ? lab(cur) : "";
    const nb = [...sel.options].filter(o => !special(o)).length;
    $("dd-foot").textContent = q ? `${t.length + r.length} gare(s) sur ${nb}` : `${nb} gares${f.length ? "" : " · ☆ pour ajouter une gare aux favoris"}`;
    DD.active = q ? 0 : Math.max(0, DD.items.findIndex(o => o.value === sel.value));
    ddActive(!q ? "top" : "nearest");
  }
  function ddActive(how = "nearest") {
    const list = $("dd-list"), lis = list.querySelectorAll(".dd-item");
    lis.forEach((li, i) => li.classList.toggle("act", i === DD.active));
    const li = lis[DD.active];
    if (how === "top") { list.scrollTop = 0; if (li && li.offsetTop + li.offsetHeight > list.clientHeight) list.scrollTop = li.offsetTop - list.clientHeight / 2; return; }
    if (how !== "nearest" || !li) return;
    /* Défilement limité à la liste (scrollIntoView ferait aussi défiler la page) */
    const h = list.querySelector(".dd-h")?.offsetHeight || 0;
    if (li.offsetTop - h < list.scrollTop) list.scrollTop = li.offsetTop - h;
    else if (li.offsetTop + li.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = li.offsetTop + li.offsetHeight - list.clientHeight;
  }
  /* Fenêtre placée comme le calendrier : sous le champ, même largeur ; la liste défile (molette ou barre) */
  function ddPlace() {
    const dd = $("dd"), r = $("f-" + DD.id).getBoundingClientRect();
    dd.style.left = `${r.left}px`; dd.style.top = `${r.bottom + 8}px`; dd.style.width = `${Math.max(r.width, 280)}px`;
    $("dd-list").style.maxHeight = `${Math.min(340, Math.max(160, innerHeight - r.bottom - 190))}px`;
  }
  function ddOpen(id) {
    const dd = $("dd");
    if (DD.id) { $(DD.id + "-btn").setAttribute("aria-expanded", "false"); $("f-" + DD.id).classList.remove("open"); }
    if (!id || $(id).disabled) { dd.hidden = true; DD.id = null; return; }
    DD.id = id; $("dd-q").value = "";
    $("dd-q").placeholder = id === "origin" ? "Rechercher une gare de départ…" : "Rechercher une destination…";
    $("dd-sub").textContent = id === "origin" ? "Gare de départ" : "Destination";
    dd.hidden = false; ddPlace();
    $(id + "-btn").setAttribute("aria-expanded", "true"); $("f-" + id).classList.add("open");
    ddRender(); $("dd-q").focus({ preventScroll: true });
  }
  function ddPick(v) {
    const id = DD.id, sel = $(id); ddOpen(null);
    DD.pickedAt = Date.now();
    sel.value = v; syncPick(id); sel.dispatchEvent(new Event("change"));
    $(id + "-btn").focus({ preventScroll: true });
  }
  for (const id of ["origin", "dest"]) {
    /* Clic n'importe où sur la ligne du champ (icône, intitulé, nom de la gare) : ouvre / ferme la liste */
    $(id + "-btn").addEventListener("click", e => {
      e.stopPropagation();
      /* Juste après un choix, la liste vient de se fermer : un double-clic (ou la touche Entrée) retomberait
         sur le bouton placé dessous et rouvrirait une liste. On ignore ce clic. */
      if (Date.now() - (DD.pickedAt || 0) < 500) return;
      ddOpen(DD.id === id ? null : id);
    });
    $(id + "-btn").addEventListener("keydown", e => {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); ddOpen(id); }
    });
    $(id).addEventListener("change", () => syncPick(id));
    /* Options remplacées (chargement, nouvelle recherche) ou champ (dés)activé : on met le bouton à jour */
    new MutationObserver(() => { syncPick(id); if (DD.id === id) ddRender(); })
      .observe($(id), { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled"] });
    syncPick(id);
  }
  $("dd-q").addEventListener("input", ddRender);
  $("dd-q").addEventListener("keydown", e => {
    const n = DD.items.length;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (n) { DD.active = (DD.active + (e.key === "ArrowDown" ? 1 : n - 1)) % n; ddActive(); } }
    else if (e.key === "Enter") { e.preventDefault(); if (DD.items[DD.active]) ddPick(DD.items[DD.active].value); }
    else if (e.key === "Escape" || e.key === "Tab") { const id = DD.id; ddOpen(null); if (e.key === "Escape") { e.preventDefault(); $(id + "-btn").focus(); } }
  });
  $("dd").addEventListener("click", e => e.stopPropagation());
  $("dd-list").addEventListener("click", e => {
    const li = e.target.closest(".dd-item"); if (!li) return;
    /* Étoile : ajoute / retire la gare des favoris, sans la choisir ; la liste garde sa position de défilement */
    if (e.target.closest(".dd-fav")) {
      const o = [...$(DD.id).options].find(o => o.value === li.dataset.v); if (!o) return;
      const list = $("dd-list"), y = list.scrollTop; toggleFav(o.text); ddRender(); list.scrollTop = y; $("dd-q").focus({ preventScroll: true });
      return;
    }
    ddPick(li.dataset.v);
  });
  $("dd-list").addEventListener("dblclick", e => e.preventDefault());
  $("dd-list").addEventListener("mousemove", e => {
    const li = e.target.closest(".dd-item"); if (!li) return;
    const i = [...$("dd-list").querySelectorAll(".dd-item")].indexOf(li);
    if (i !== DD.active) { DD.active = i; ddActive(false); }
  });
  document.addEventListener("click", () => DD.id && ddOpen(null));
  addEventListener("resize", () => DD.id && ddPlace());
  /* Le panneau de gauche défile : la liste (positionnée sur l'écran) se ferme */
  addEventListener("scroll", e => DD.id && !$("dd").contains(e.target) && ddOpen(null), true);
})();

/* Carte, recherche, liste, calendrier… MapLibre GL et Carte facile sont importés dynamiquement
   (adresses dans l'importmap de index.html) : un script classique qui importe ainsi fonctionne aussi en file://,
   contrairement à un <script type="module" src> externe. */
(async () => {
  "use strict";
  const maplibregl = await import("maplibre-gl");
  const { mapStyles, MapSelectorControl } = await import("carte-facile");
  /* ---------- Configuration ---------- */
  const EXPORT = "https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets/tgvmax/exports/json";
  // Noms de champs du jeu de données "tgvmax" : à ajuster si SNCF les modifie (voir la console de l'API).
  const F = { date: "date", origin: "origine", originIata: "origine_iata", dest: "destination", destIata: "destination_iata", dep: "heure_depart", arr: "heure_arrivee", train: "train_no", ok: "od_happy_card", entity: "entity", axe: "axe" };
  const isOk = v => v === true || String(v).toUpperCase() === "OUI";

  const clean = n => n.replace(/\s*\(.*?\)/g, "").toLowerCase().replace(/(^|[\s-])\S/g, m => m.toUpperCase());
  const frDate = d => new Date(d + "T12:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  const phrase = (from, to, date, time) => `${clean(from)} ${clean(to)} le ${frDate(date)} à ${time.replace(":", "h")}`;
  /* SNCF Connect : lien de redirection direct vers la recherche (codes = ceux du jeu de données, date AAAA-MM-JJ-HH-MM). */
  const sncfLink = (oi, di, date, time) => `https://www.sncf-connect.com/fr-fr/redirect?${new URLSearchParams({
    nb_pax: 1, outward_date: `${date}-${time.replace(":", "-")}`, origin_transporter_code: oi, destination_transporter_code: di, redirection_type: "SEARCH"
  })}`;
  /* Trainline : la page de résultats demande des identifiants Trainline (urn:trainline:generic:loc:ID). L'API de recherche de Trainline
     refuse les appels venant d'un autre site (CORS) : les identifiants sont donc rangés dans la table ci-dessous (clé = nom de gare
     normalisé par norm(), comme dans le jeu de données tgvmax). Gare absente : page d'accueil de Trainline avec la recherche copiée.
     Pour ajouter une gare : l'ID figure dans l'URL d'une recherche sur thetrainline.com/fr. */
  const TRAINLINE_BASE = "https://www.thetrainline.com";
  const TL_IDS = {
    "AEROPORT ROISSY CDG 2 TGV": "1144", "AGDE": "5744", "AGEN": "207", "AIME LA PLAGNE": "5021", "AIX EN PROVENCE TGV": "233",
    "AIX LES BAINS LE REVARD": "5745", "ALBERTVILLE": "5750", "ALBI MADELEINE": "316", "ALBI VILLE": "191", "AMIENS": "5022", "ANCENIS": "2186",
    "ANGERS SAINT LAUD": "84", "ANGOULEME": "347", "ANNECY": "4843", "ANNEMASSE": "5039", "ANTIBES": "5749", "ARCACHON": "5743", "ARGELES SUR MER": "416",
    "ARGENTON SUR CREUSE": "215", "ARLES": "4143", "ARRAS": "5042", "ARVANT": "425", "ASSIER": "2716", "AUBIN": "2937", "AUGSBURG HBF": "6850",
    "AUMONT AUBRAC": "4444", "AURAY": "5845", "AURILLAC": "481", "AUTERIVE": "2873", "AVIGNON CENTRE": "171", "AVIGNON TGV": "485",
    "AX LES THERMES": "5796", "BADEN BADEN": "7726", "BANASSAC LA CANOURGUE": "4447", "BANYULS SUR MER": "5759", "BAR LE DUC": "5753",
    "BARCELONA SANTS": "6625", "BASEL SBB": "5878", "BAYONNE": "5762", "BEAUNE": "5760", "BEDARIEUX": "4429", "BELFORT MONTBELIARD TGV": "10496",
    "BELLEGARDE SUR VALSERINE GARE": "140", "BERLIN GESUNDBRUNNEN": "14564", "BERLIN HBF": "7630", "BERLIN SUDKREUZ": "7528",
    "BESANCON FRANCHE COMTE TGV": "10498", "BESANCON VIOTTE": "45", "BETHUNE": "5754", "BEZIERS": "1066", "BIARRITZ": "713", "BIGANOS FACTURE": "2553",
    "BORDEAUX ST JEAN": "828", "BOULOGNE VILLE": "149", "BOURG EN BRESSE": "5755", "BOURG SAINT MAURICE": "5028", "BOURGES": "843",
    "BRASSAC LES MINES STE FLORINE": "3839", "BREST": "659", "BRETENOUX BIARS": "1000", "BRIANCON": "5752", "BRIVE LA GAILLARDE": "957",
    "BRUXELLES MIDI": "5893", "CAHORS": "5870", "CALAIS FRETHUN": "1419", "CAMPAGNAC ST GENIEZ": "4448", "CANNES": "1180", "CAPDENAC": "1139",
    "CARCASSONNE": "1119", "CARMAUX": "3008", "CAUSSADE": "2944", "CEILHES ROQUEREDONDE": "4424", "CERBERE": "5766", "CHALON SUR SAONE": "5765",
    "CHALONS EN CHAMPAGNE": "1125", "CHAMBERY CHALLES LES EAUX": "1339", "CHAMPAGNE ARDENNE TGV": "91", "CHARLEVILLE MEZIERES": "5775",
    "CHATEAUROUX": "1257", "CHATELLERAULT": "5773", "CHORGES": "4318", "CLERMONT FERRAND": "1193", "CLUSES": "4035", "COLLIOURE": "5771", "COLMAR": "157",
    "COMMERCY": "692", "COMMERCY ZONE DU SEUGNON": "692", "CRANSAC": "2938", "CREST": "1440", "CROIX WASQUEHAL": "130", "CULMONT CHALINDREY": "1137",
    "DAX": "77", "DIE": "1778", "DIJON VILLE": "38", "DOL DE BRETAGNE": "1916", "DOLE VILLE": "76", "DOUAI": "5777", "DUNKERQUE": "122", "ELNE": "4471",
    "EMBRUN": "4321", "EPINAL": "2343", "ERFURT HBF": "7588", "ETAPLES LE TOUQUET": "2416", "EVIAN LES BAINS": "5778", "FIGEAC": "2719",
    "FIGUERES VILAFANT": "10481", "FOIX": "5780", "FORBACH": "117", "FRANKFURT AM MAIN HBF": "7604", "FRASNE": "2902", "FREIBURG HBF": "7597",
    "FUTUROSCOPE": "5002", "GAP": "9299", "GENEVE CORNAVIN": "5335", "GIRONA": "6655", "GOURDON": "2930", "GRAMAT": "2925", "GRENOBLE": "3358",
    "GUINGAMP": "3232", "HALLE HBF": "7736", "HAZEBROUCK": "4151", "HENDAYE": "152", "HYERES": "5784", "ISSOIRE": "3836", "ISSOUDUN": "2810",
    "JONZAC": "2301", "KAISERSLAUTERN HBF": "7667", "KARLSRUHE HBF": "7666", "L ARGENTIERE LES ECRINS": "4328", "L HOSPITALET PRES L AND.": "2882",
    "LA BAULE ESCOUBLAC": "4564", "LA ROCHE SUR YON": "5815", "LA ROCHELLE VILLE": "4687", "LA SOUTERRAINE": "4701", "LA TESTE": "2607",
    "LAHR SCHWARZW": "7042", "LAMBALLE": "4598", "LANDERNEAU": "5790", "LANDRY": "3931", "LANNEMEZAN": "4670", "LANNION": "4596",
    "LAROQUEBROU BATIMENT VOYAGEURS": "3115", "LATOUR DE CAROL ENVEITG": "5279", "LAUSANNE": "6247", "LAVAL": "93", "LE BOUSQUET D ORB": "4428",
    "LE CREUSOT MONTCEAU MONTCHANIN": "4729", "LE CROISIC": "2207", "LE HAVRE": "178", "LE MANS": "172", "LE MONASTIER": "4664", "LE POULIGUEN": "2205",
    "LENS": "5791", "LEROUVILLE CENTRE": "9490", "LES ARCS DRAGUIGNAN": "5816", "LES AUBRAIS ORLEANS": "4594", "LES CABANNES": "2886",
    "LES SABLES D OLONNE": "4698", "LIBOURNE": "5795", "LILLE": "4652", "LIMOGES BENEDICTINS": "211", "LORIENT": "4690", "LORRAINE TGV": "2094",
    "LOURDES": "4626", "LUC EN DIOIS": "4292", "LUCON": "4618", "LUNEVILLE": "4666", "LUXEMBOURG": "8604", "LUZENAC GARANOU": "2884", "LYON": "4718",
    "LYON ST EXUPERY TGV.": "4558", "MACON LOCHE TGV": "4756", "MACON VILLE": "3751", "MAGALAS": "4430", "MANNHEIM HBF": "7479", "MANTES LA JOLIE": "4804",
    "MARMANDE": "5802", "MARNE LA VALLEE CHESSY": "4757", "MARSEILLE BLANCARDE": "4723", "MARSEILLE ST CHARLES": "4791", "MARVEJOLS": "4445",
    "MASSIAC BLESLE": "3880", "MASSY PALAISEAU": "2002", "MASSY TGV": "1818", "MERENS LES VALS": "2883", "METZ VILLE": "114", "MEUSE TGV": "2091",
    "MILANO PORTA GARIBALDI": "8492", "MILLAU": "4719", "MIRAMAS": "4722", "MODANE": "212", "MONTAUBAN VILLE BOURBON": "5804", "MONTBARD": "3527",
    "MONTDAUPHIN GUILLESTRE": "4325", "MONTELIMAR GARE SNCF": "4807", "MONTPELLIER SAINT ROCH": "4786", "MONTPELLIER SUD DE FRANCE": "33317",
    "MONTREJEAU GOURDAN POLIGNAN": "4805", "MORLAIX": "4822", "MOUCHARD": "4728", "MOULINS SUR ALLIER": "5803", "MOUTIERS SALINS BRIDES LES BAINS": "5038",
    "MULHOUSE VILLE": "158", "MUNCHEN HBF": "7480", "NANCY": "2312", "NANTES": "4866", "NARBONNE": "5806", "NAUCELLE": "3013", "NEUFCHATEAU": "4842",
    "NEUSSARGUES": "4848", "NEVERS": "4858", "NICE VILLE": "4839", "NIMES CENTRE": "2825", "NIMES PONT DU GARD": "38108", "NIORT": "4853",
    "NURIEUX GARE": "3960", "OFFENBURG": "7746", "ORANGE": "5808", "ORTHEZ": "3202", "PAMIERS": "4980", "PARIS": "4916",
    "PARIS GARE DE LYON": "4924", "PARIS MONTPARNASSE": "4920", "PARIS NORD": "4922", "PARIS EST": "4919", "PARIS AUSTERLITZ": "4921", "PARIS BERCY": "4917",
    "LYON PART DIEU": "4676", "LYON PERRACHE": "4677", "LILLE EUROPE": "4653", "LILLE FLANDRES": "123", "PARIS MONTPARNASSE VAUGIRARD":"4920", "PAU": "151", "PERPIGNAN": "4955", "PLOUARET TREGOR": "4975", "POITIERS": "4964", "PORNICHET": "2204",
    "PORT VENDRES VILLE": "5812", "PORTE PUYMORENS": "2881", "QUIMPER": "5432", "QUIMPERLE": "2138", "RANG DU FLIERS VERTON BERCK": "1539",
    "REDON": "5814", "REIMS": "89", "REMIREMONT": "5098", "RENNES": "5097", "RETHEL": "640", "RINGSHEIM EUROPA PARK": "13237", "RIOM CHATEL GUYON": "5084",
    "ROANNE": "5096", "ROCAMADOUR PADIRAC": "2924", "ROCHEFORT": "5060", "RODEZ": "5069", "ROSPORDEN": "5107", "ROUBAIX": "132",
    "ROUEN RIVE DROITE": "5601", "SAARBRUECKEN/SARREBRUCK": "7708", "SABLE SUR SARTHE": "5126", "SAINT AVRE LA CHAMBRE": "3910",
    "SAINT CHELY D APCHER": "4443", "SAINT ETIENNE CHATEAUCREUX": "2122", "SAINT GEORGES DE LUZENCON": "4451", "SAINT GERMAIN DES FOSSES": "5181",
    "SAINT QUENTIN": "5823", "SAINT ROME DE CERNON": "4452", "SAINTES": "5830", "SALLANCHES COMBLOUX MEGEVE": "5826", "SARREBOURG": "5142", "SAUMUR": "85",
    "SAVERDUN": "2871", "SAVERNE": "5216", "SEDAN": "5166", "SELESTAT": "5828", "SETE": "5834", "SEVERAC LE CHATEAU": "5254", "SOUILLAC": "5225",
    "ST BRIEUC": "5144", "ST CHRISTOPHE": "2940", "ST DENIS PRES MARTEL": "5162", "ST DIE": "5838", "ST FLOUR CHAUDES AIGUES": "4438",
    "ST GAUDENS": "2861", "ST GERVAIS LES BAINS LE FAYET": "5781", "ST JEAN DE LUZ CIBOURE": "5788", "ST JEAN DE MAURIENNE ARVAN": "3934",
    "ST MAIXENT": "2243", "ST MALO": "5818", "ST MICHEL VALLOIRE": "5852", "ST NAZAIRE": "5219", "ST PIERRE DES CORPS": "5821",
    "ST RAPHAEL VALESCURE": "5824", "ST VINCENT DE TYROSSE": "3242", "STRASBOURG": "153", "STUTTGART HBF": "7710", "SURGERES": "2234",
    "TARASCON SUR ARIEGE": "2888", "TARBES": "5836", "TGV HAUTE PICARDIE": "5298", "THIONVILLE": "5839", "THONON LES BAINS": "5843",
    "TORINO PORTA SUSA": "8568", "TOUL": "5322", "TOULON": "5304", "TOULOUSE MATABIAU": "5311", "TOURCOING": "125", "TOURNEMIRE ROQUEFORT": "4453",
    "TOURS": "203", "ULM HBF": "7700", "UZERCHE": "36", "VALENCE TGV AUVERGNE RHONE ALPES": "5614", "VALENCE VILLE": "5610", "VALENCIENNES": "5853",
    "VALLORBE": "6176", "VANNES": "5663", "VENDOME VILLIERS SUR LOIR": "2406", "VERDUN": "5850", "VERSAILLES CHANTIERS": "223", "VEYNES DEVOLUY": "5626",
    "VICHY": "5638", "VIERZON": "5674", "VITRE": "5854", "VITRY LE FRANCOIS": "667", "VIVIEZ DECAZEVILLE": "25", "ZURICH HB": "6245"
  };
  try { localStorage.removeItem("tlIds"); } catch { }   // ancien cache de l'API Trainline, parfois erroné
  const tlId = name => TL_IDS[norm(name)] || null;
  const trainlineLink = (o, d, date, time) => !(o && d) ? `${TRAINLINE_BASE}/fr` :
    `${TRAINLINE_BASE}/book/results?${new URLSearchParams([["journeySearchType", "single"], ["origin", `urn:trainline:generic:loc:${o}`], ["destination", `urn:trainline:generic:loc:${d}`], ["outwardDate", `${date}T${time}:00`], ["outwardDateType", "departAfter"], ["selectedTab", "train"], ["splitSave", "true"], ["lang", "fr"], ["transportModes[]", "mixed"]])}`;

  /* Type de train : TGV INOUI / OUIGO / Intercités (jour) / Intercités de nuit, d'après les champs entity et axe du jeu de données.
     Une liaison arrivant le lendemain après 4 h 30 ou plus de trajet est considérée comme « de nuit ». */
  const KIND = { TGV: ["TGV INOUI", "#14837a"], OUIGO: ["OUIGO", "#c55a86"], IC: ["Intercités", "#c08a3e"], ICN: ["Intercités de nuit", "#5b62b3"] };
  /* Points des destinations (hors gares de correspondance) dans la source « routes » */
  const IS_LINE = ["==", ["geometry-type"], "LineString"], IS_CONN = ["==", ["get", "conn"], true];
  const IS_PT = ["all", ["==", ["geometry-type"], "Point"], ["!=", ["get", "via"], true]];
  const KCOL = ["match", ["get", "kind"], "TGV", "#14837a", "OUIGO", "#c55a86", "IC", "#c08a3e", "ICN", "#5b62b3", "#a9b4bf"];
  /* Train de nuit : passe minuit ET arrive à partir de 5h du matin (un Intercités du soir arrivant vers 0h30 n'en est pas un) */
  const overnight = x => { const m = h => { const [a, b] = h.split(":"); return +a * 60 + +b; }; const d = m(x.arr) - m(x.dep); return d < 0 && d + 1440 >= 270 && m(x.arr) >= 300; };
  /* Le jeu de données tgvmax ne contient aujourd'hui aucun OUIGO (filtre et légende retirés). Reconnaissance gardée au cas où il en contiendrait :
     par le nom (entity/axe) ou les numéros de train (76xx à 79xx). */
  const isOuigo = (x, t) => /OUIGO/.test(t) || /^7[6-9]\d\d$/.test(String(x.no || "").trim());
  const kindOf = x => {
    const t = fold(`${x.entity || ""} ${x.axe || ""}`), night = overnight(x) || t.includes("NUIT");
    if (/INTERCITES|\bIC\b/.test(t)) return night ? "ICN" : "IC";
    if (isOuigo(x, t)) return "OUIGO";
    if (/TGV|INOUI|EUROSTAR|LYRIA/.test(t)) return "TGV";
    return night ? "ICN" : "TGV";   // par défaut : TGV INOUI
  };
  /* Nom de la pastille d'une destination : un segment par type disponible avec son nombre de trains (aller + retour) */
  /* Un trajet avec correspondance(s) compte pour le type de chacun de ses trains (pas seulement le premier) */
  const hasKind = (t, k) => (t.legs || [t]).some(l => l.kind === k);
  const pillId = (ok, free, rfree) => "pill-" + (!ok ? "" : Object.keys(KIND).map(k => [k, [...free, ...(rfree || [])].filter(t => hasKind(t, k)).length]).filter(([, n]) => n).map(([k, n]) => k + n).join("."));
  /* Types de train cochés dans le formulaire : null = tous ; sinon un Set (« TGV », « IC », « ICN »).
     Un itinéraire avec correspondance n'est gardé que si chacun de ses trains est d'un type coché. */
  const kindBoxes = () => [...document.querySelectorAll("#kind input")];
  const kindSet = () => { const b = kindBoxes(), on = b.filter(x => x.checked); return on.length === b.length ? null : new Set(on.map(x => x.value)); };
  const kindOk = (t, ks) => !ks || (t.legs || [t]).every(l => ks.has(l.kind));
  const bestKind = free => ["TGV", "OUIGO", "IC", "ICN"].find(k => free.some(t => t.kind === k)) || "TGV";
  const norm = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\(.*?\)/g, "").replace(/[-']/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
  let GEO = {}; try { GEO = JSON.parse(localStorage.getItem("geoGares") || "{}"); } catch { }
  /* Coordonnées de référence : liste des gares SNCF (GeoJSON), puis géocodage en cache. Le jeu de données tgvmax n'en contient pas. */
  const tableLocate = name => stationLocate(name) || GEO[norm(name)] || null;
  const locate = name => tableLocate(name) || graphLocate(name);
  /* Gares absentes de la liste : géocodage via la Géoplateforme IGN, mis en cache dans le navigateur (positions approximatives). */
  async function geocodeMissing(names) {
    const todo = [...new Set(names.filter(n => !locate(n)).map(norm))].filter(n => !(n in GEO));
    await Promise.all(todo.map(async n => {
      try {
        const r = await fetch(`https://data.geopf.fr/geocodage/search?q=${encodeURIComponent("gare " + n.toLowerCase())}&limit=1`);
        const [x, y] = (await r.json()).features?.[0]?.geometry?.coordinates || [];
        GEO[n] = (x > -6 && x < 10 && y > 41 && y < 52) ? [x, y] : false;
      } catch { }
    }));
    try { localStorage.setItem("geoGares", JSON.stringify(GEO)); } catch { }
  }

  /* ---------- Tracés ferroviaires (Train Nomade) : graphe de tronçons entre gares ---------- */
  const TRACES_URL = "trainnomade-traces-ferroviaires.geojson";   // à placer à côté de cette page
  const EMPTY_FC = { type: "FeatureCollection", features: [] };
  let tracesData = EMPTY_FC;   // couche « rails » : affichée directement depuis le GeoJSON
  const G = { ready: false, feats: [], adj: new Map(), names: new Map(), nname: new Map(), coord: new Map(), cache: new Map() };
  const nn = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\(.*?\)/g, " ").replace(/\bSAINTE\b/g, "STE").replace(/\bSAINT\b/g, "ST").replace(/[^A-Z0-9]+/g, " ").trim();
  /* Tronçons du jeu de données écartés car leur tracé fait un aller-retour inutile :
     Paris Austerlitz → Saint-Denis-lès-Martel passe par Brive, descend ~25 km au sud puis le trajet remonte vers Brive. */
  const TRONCONS_EXCLUS = new Set(["87547000-87594572"]);
  /* Tronçons absents du jeu de données, ajoutés à la main (tracé OpenStreetMap, raccordé aux tracés Train Nomade voisins).
     Mantes-la-Jolie → Versailles-Chantiers (TGV Normandie – Sud-Est) : ligne de Paris au Havre jusqu'à Épône-Mézières,
     ligne de Plaisir-Grignon à Épône-Mézières, puis ligne de Saint-Cyr à Surdon. Sans lui, le tracé faisait un détour par Évreux, Lisieux et Dreux. */
  const TRONCONS_AJOUTES = [
    { troncon_id: "87381509-87393009", code_uic_a: "87381509", gare_a: "Mantes-la-Jolie", code_uic_b: "87393009", gare_b: "Versailles Chantiers", longueur_m: 44200, vitesse_max_kmh: 120,
      coordinates: [[1.70301,48.98933],[1.7067,48.98797],[1.71225,48.98489],[1.7147,48.98374],[1.72787,48.97876],[1.73312,48.97587],[1.73768,48.97252],[1.74022,48.97101],[1.74835,48.96752],[1.75265,48.96613],[1.75733,48.96511],[1.76039,48.96462],[1.76416,48.96418],[1.76988,48.96375],[1.77589,48.96351],[1.79794,48.96309],[1.80478,48.96312],[1.81174,48.96351],[1.81702,48.96406],[1.82182,48.96483],[1.82217,48.964],[1.82399,48.9635],[1.82662,48.9625],[1.82822,48.96167],[1.8294,48.96086],[1.83102,48.95929],[1.83204,48.95771],[1.83526,48.94791],[1.83589,48.94646],[1.83814,48.94318],[1.84114,48.93767],[1.84417,48.93363],[1.84658,48.92934],[1.84977,48.92245],[1.85145,48.91767],[1.85389,48.91247],[1.85485,48.91124],[1.85624,48.91002],[1.86249,48.90606],[1.86502,48.90398],[1.86612,48.90245],[1.87182,48.89311],[1.87659,48.87385],[1.87661,48.87227],[1.87639,48.87122],[1.87445,48.86747],[1.87414,48.8657],[1.87433,48.86446],[1.87594,48.85895],[1.87662,48.85744],[1.87895,48.85444],[1.88026,48.85332],[1.88204,48.85232],[1.88879,48.84909],[1.89034,48.84801],[1.89143,48.84686],[1.89481,48.84178],[1.89623,48.84047],[1.89796,48.83949],[1.9003,48.83865],[1.9127,48.83527],[1.91534,48.83467],[1.91796,48.83426],[1.92479,48.83351],[1.95313,48.83115],[1.97906,48.83049],[1.98109,48.8303],[1.98305,48.82991],[1.98537,48.82915],[1.98743,48.82811],[1.98891,48.82706],[1.99251,48.82389],[1.9939,48.82303],[1.99559,48.82227],[2.03221,48.80883],[2.03567,48.80799],[2.04417,48.80666],[2.04702,48.8058],[2.04943,48.80449],[2.05229,48.80197],[2.05596,48.79931],[2.05803,48.79828],[2.06054,48.79759],[2.06269,48.79734],[2.06473,48.79737],[2.06634,48.79757],[2.07159,48.79855],[2.07335,48.79865],[2.07526,48.79857],[2.07726,48.7983],[2.07906,48.79787],[2.08516,48.79548],[2.08691,48.79499],[2.08862,48.79467],[2.09051,48.7945],[2.09201,48.7945],[2.10348,48.79565],[2.10594,48.79564],[2.10829,48.7952],[2.11245,48.79365],[2.11499,48.793],[2.12386,48.79196],[2.1259,48.79204],[2.128,48.79241],[2.13006,48.79311],[2.13329,48.79462],[2.13558,48.79519]] }
  ];
  function buildGraph(gj) {
    gj = { ...gj, features: gj.features.filter(f => !TRONCONS_EXCLUS.has(f.properties.troncon_id)) };
    const have = new Set(gj.features.map(f => f.properties.troncon_id));
    for (const { coordinates, ...p } of TRONCONS_AJOUTES) if (!have.has(p.troncon_id)) gj.features.push({ type: "Feature", properties: p, geometry: { type: "LineString", coordinates } });
    G.feats = gj.features; G.adj.clear(); G.names.clear(); G.nname.clear(); G.coord.clear(); G.cache.clear();
    gj.features.forEach((f, i) => {
      const p = f.properties, c = f.geometry.coordinates, w = p.longueur_m / Math.max(p.vitesse_max_kmh, 30);   // temps ≈ longueur / vitesse max
      for (const [k, name, xy] of [[p.code_uic_a, p.gare_a, c[0]], [p.code_uic_b, p.gare_b, c[c.length - 1]]]) {
        if (!G.names.has(k)) { G.names.set(k, name); G.nname.set(k, nn(name)); G.coord.set(k, xy); G.adj.set(k, []); }
      }
      G.adj.get(p.code_uic_a).push({ to: p.code_uic_b, w, i }); G.adj.get(p.code_uic_b).push({ to: p.code_uic_a, w, i });
    });
    G.ready = true;
    tracesData = gj; map.getSource("lgv")?.setData(gj);
  }
  /* Noms du jeu de données SNCF (normalisés) → nom de la gare dans les tracés ferroviaires, quand ils diffèrent trop pour être rapprochés */
  const G_ALIAS = { "AEROPORT ROISSY CDG 2 TGV": "AEROPORT CHARLES DE GAULLE 2 TGV" };
  /* Gares du graphe correspondant à un nom du jeu de données : nom exact, sinon toutes les gares de la ville, sinon la gare au nom le plus proche, sinon la plus proche (≤ 15 km) */
  function gNodes(name) {
    if (!G.ready) return [];
    const n = G_ALIAS[nn(name)] || nn(name); if (G.cache.has(n)) return G.cache.get(n);
    const all = [...G.nname]; let r = all.filter(([, v]) => v === n);
    if (!r.length) r = all.filter(([, v]) => v.startsWith(n + " "));
    /* Tous les mots significatifs du nom dans celui de la gare du graphe (au moins deux) : « LE CREUSOT MONTCEAU MONTCHANIN »
       → « Le Creusot - Montceau-les-Mines - Montchanin TGV », et non « Le Creusot » (gare de ville, simple préfixe) */
    if (!r.length) {
      const want = n.split(" ").filter(t => t.length > 1 && !STOP.has(t));
      if (want.length >= 2) r = all.filter(([, v]) => { const tk = new Set(v.split(" ")); return want.every(t => tk.has(t)); });
    }
    /* Gare TGV : la gare TGV de la même ville (nom avant « TGV »), et non la gare du centre au nom plus court :
       « VALENCE TGV AUVERGNE RHONE ALPES » → « Valence TGV Rhône-Alpes Sud », et non « Valence » */
    if (!r.length && /\bTGV\b/.test(n)) {
      const city = n.split(/\s*\bTGV\b/)[0].trim();
      if (city) r = all.filter(([, v]) => (v === city || v.startsWith(city + " ")) && /\bTGV\b/.test(v));
    }
    if (!r.length) { const m = all.filter(([, v]) => n.startsWith(v + " ")), L = Math.max(0, ...m.map(([, v]) => v.length)); r = m.filter(([, v]) => v.length === L); }
    let out = r.map(([k]) => k);
    if (!out.length) {
      const c = tableLocate(name);
      if (c) { let best = null, bd = .15; for (const [k, xy] of G.coord) { const d = Math.hypot((xy[0] - c[0]) * Math.cos(c[1] * Math.PI / 180), xy[1] - c[1]); if (d < bd) { bd = d; best = k; } } if (best) out = [best]; }
    }
    G.cache.set(n, out); return out;
  }
  const graphLocate = name => { const k = gNodes(name)[0]; return k ? G.coord.get(k) : null; };

  /* ---------- Liste des gares (SNCF Réseau) : gares voyageurs, dédoublonnées par code UIC ---------- */
  const GARES_URL = "liste-des-gares.geojson";   // à placer à côté de cette page
  let garesData = EMPTY_FC;
  const S = { list: [], cache: new Map() };
  const STOP = new Set(["TGV", "ST", "STE", "LA", "LE", "LES", "DE", "DU", "DES", "SUR", "EN", "ET", "AU", "AUX", "GARE", "VILLE", "CENTRE", "RER"]);
  function buildGares(gj) {
    const seen = new Set(), feats = []; S.list = []; S.cache.clear(); S.df = new Map();
    for (const f of gj.features) {
      const p = f.properties; if (seen.has(p.code_uic) || f.geometry?.type !== "Point") continue;
      seen.add(p.code_uic);
      const v = p.voyageurs === "O", L = nn(p.libelle), C = nn(p.commune || ""), tgv = /TGV/.test(L);
      if (v) feats.push({ type: "Feature", properties: { name: p.libelle, commune: p.commune, tgv }, geometry: f.geometry });
      const tok = new Set([...L.split(" "), ...C.split(" ")]);
      tok.forEach(t => S.df.set(t, (S.df.get(t) || 0) + 1));
      S.list.push({ xy: f.geometry.coordinates, L, C, tgv, v, tok });   // les gares sans voyageurs ne servent qu'en dernier recours
    }
    garesData = { type: "FeatureCollection", features: feats }; map.getSource("gares")?.setData(garesData);
    G.cache.clear();
  }
  /* Gares desservies mais absentes de la liste SNCF Réseau (gare RATP) : [lon, lat] */
  const ABSENTES = { "MARNE LA VALLEE CHESSY": [2.7826, 48.8698] };
  const centroid = r => [r.reduce((a, s) => a + s.xy[0], 0) / r.length, r.reduce((a, s) => a + s.xy[1], 0) / r.length];
  /* Nom du jeu de données → coordonnées : libellé exact, sinon gares de la ville (centre), sinon libellé le plus long contenu
     dans le nom, sinon meilleure correspondance de mots (le premier mot significatif doit correspondre, ou au moins deux). */
  function stationLocate(name) {
    const n = nn(name); if (!n || !S.list.length) return null;
    if (S.cache.has(n)) return S.cache.get(n);
    const find = test => { const r = S.list.filter(test), v = r.filter(s => s.v); return v.length ? v : r; };
    if (ABSENTES[n]) return ABSENTES[n];
    let r = find(s => s.L === n);
    if (!r.length) r = find(s => s.C === n && s.L.startsWith(n + " "));
    if (!r.length) r = find(s => s.L.startsWith(n + " "));
    if (!r.length) r = find(s => s.C === n);
    if (!r.length) { const m = find(s => n.startsWith(s.L + " ")), Lm = Math.max(0, ...m.map(s => s.L.length)); r = m.filter(s => s.L.length === Lm); }
    if (!r.length) {
      /* Mots pondérés par leur rareté (un mot présent dans peu de gares pèse plus) */
      const want = n.split(" ").filter(t => t.length > 1 && !STOP.has(t)), tgv = /TGV/.test(n), w = t => 1 / (S.df.get(t) || 1);
      let best = null, bs = 0;
      for (const s of S.list) {
        const hit = want.filter(t => s.tok.has(t)); if (!hit.length) continue;
        if (hit.length < 2 && hit[0] !== want[0]) continue;   // le 1er mot significatif, ou au moins deux mots, doivent correspondre
        const sc = hit.reduce((a, t) => a + w(t), 0) + (tgv && s.tgv ? .5 : 0) + (s.v ? .01 : 0);
        if (sc > bs) { bs = sc; best = s; }
      }
      if (best) r = [best];
    }
    const out = r.length ? centroid(r) : null;
    S.cache.set(n, out); return out;
  }
  class Heap {
    constructor() { this.a = []; }
    get size() { return this.a.length; }
    push(x) { const a = this.a; a.push(x); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break;[a[p], a[i]] = [a[i], a[p]]; i = p; } }
    pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (; ;) { let m = i, c = 2 * i + 1; if (c < a.length && a[c][0] < a[m][0]) m = c; if (++c < a.length && a[c][0] < a[m][0]) m = c; if (m === i) break;[a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; }
  }
  /* Plus court chemin (en temps) entre toutes les gares d'origine possibles et toutes celles de destination.
     classic = true : Intercités (jour et nuit), qui roulent sur le réseau classique : les LGV (≥ 250 km/h) sont exclues.
     Si aucun chemin n'existe sans LGV, on retombe sur le chemin le plus rapide. */
  const LGV_KMH = 250;
  /* Points de passage imposés aux TGV / OUIGO, quand le plus court chemin théorique ne correspond pas à la desserte réelle.
     [gares concernées (nom normalisé), gare de passage] : les TGV vers la Côte d'Opale empruntent la LGV Nord jusqu'à
     Calais-Fréthun puis descendent par Boulogne, et non la ligne classique par Amiens et Abbeville.
     Le passage n'est imposé que si l'autre extrémité du trajet est plus loin de la gare de passage que la gare concernée
     (ex. Paris ou Lille → Étaples, mais pas Boulogne → Étaples). */
  const VIA = [[/^(ETAPLES|RANG DU FLIERS)\b/, "CALAIS FRETHUN"]];
  const gDist = (a, b) => { const p = graphLocate(a), q = graphLocate(b); return p && q ? Math.hypot((p[0] - q[0]) * Math.cos(p[1] * Math.PI / 180), p[1] - q[1]) : null; };
  function viaFor(A, B) {
    for (const [re, via] of VIA) {
      const ra = re.test(nn(A)), rb = re.test(nn(B)); if (ra === rb) continue;   // aucune ou les deux extrémités concernées
      const [x, y] = ra ? [A, B] : [B, A], dx = gDist(x, via), dy = gDist(y, via);
      if (dx != null && dy != null && dy > dx) return via;
    }
    return null;
  }
  /* start : gare du graphe d'où partir (fin du tronçon précédent), pour enchaîner les étapes sans saut entre deux gares d'une même ville */
  function gRoute(A, B, classic = false, start = null) {
    if (classic) return gSearch(A, B, true, start) || gSearch(A, B, false, start);
    const v = viaFor(A, B);
    if (v) { const s1 = gSearch(A, v, false, start), s2 = s1 && gSearch(v, B, false, segEnd(s1)); if (s1 && s2) return [...s1, ...s2]; }
    return gSearch(A, B, false, start);
  }
  /* Gare du graphe où arrive une suite de tronçons */
  const segEnd = segs => { if (!segs?.length) return null; const { i, from } = segs[segs.length - 1], p = G.feats[i].properties; return from === p.code_uic_a ? p.code_uic_b : p.code_uic_a; };
  /* Tracé d'un train passant par ses arrêts, dans l'ordre : A → arrêt 1 → arrêt 2 → … → B.
     Un arrêt absent du graphe (ou injoignable) est ignoré ; null si l'arrivée elle-même est injoignable. */
  function gRouteVia(A, stops, B, classic) {
    const segs = []; let cur = A, start = null;
    for (const w of [...stops, B]) {
      const s = gRoute(cur, w, classic, start);
      if (!s) { if (w === B) return null; continue; }
      segs.push(...s); cur = w; start = segEnd(s) || start;
    }
    return segs;
  }
  function gSearch(A, B, classic, start = null) {
    const S = start ? [start] : gNodes(A), T = new Set(gNodes(B)); if (!S.length || !T.size) return null;
    const dist = new Map(S.map(k => [k, 0])), prev = new Map(), h = new Heap(); S.forEach(k => h.push([0, k]));
    while (h.size) {
      const [d, u] = h.pop(); if (d > dist.get(u)) continue;
      if (T.has(u)) { const segs = []; let x = u; while (prev.has(x)) { const q = prev.get(x); segs.push({ i: q.i, from: q.u }); x = q.u; } return segs.reverse(); }
      for (const e of G.adj.get(u) || []) { if (classic && G.feats[e.i].properties.vitesse_max_kmh >= LGV_KMH) continue; const nd = d + e.w; if (nd < (dist.get(e.to) ?? Infinity)) { dist.set(e.to, nd); prev.set(e.to, { u, i: e.i }); h.push([nd, e.to]); } }
    }
    return null;
  }
  function pathGeo(segs) {
    const feats = [], coords = [];
    for (const { i, from } of segs) {
      const p = G.feats[i].properties, fwd = from === p.code_uic_a; let c = G.feats[i].geometry.coordinates; if (!fwd) c = [...c].reverse();
      feats.push({ type: "Feature", properties: { v: p.vitesse_max_kmh, a: fwd ? p.gare_a : p.gare_b, b: fwd ? p.gare_b : p.gare_a, km: Math.round(p.longueur_m / 1000) }, geometry: { type: "LineString", coordinates: c } });
      for (const xy of c) coords.push(xy);
    }
    return { feats, coords };
  }
  const cumul = coords => { const cum = [0]; for (let i = 1; i < coords.length; i++) { const [x1, y1] = coords[i - 1], [x2, y2] = coords[i]; cum.push(cum[i - 1] + Math.hypot((x2 - x1) * Math.cos((y1 + y2) * Math.PI / 360), y2 - y1) * 111.2); } return cum; };

  /* ---------- API ---------- */
  /* Endpoint d'export : renvoie tous les résultats d'un coup, sans pagination ni limite de 100. */
  async function fetchAll(params) {
    const r = await fetch(`${EXPORT}?${new URLSearchParams({ ...params, limit: -1 })}`);
    if (!r.ok) throw new Error(`API SNCF : HTTP ${r.status}`);
    return (await r.json()).filter(inScope).map(realNames);
  }
  /* Gares à l'étranger écartées partout (départs, destinations, correspondances, arrêts intermédiaires), sauf Luxembourg et
     Fribourg-en-Brisgau. Le code de gare commence par le code du pays (FR…, DE…, CH…). Une ligne n'est gardée que si
     chacune de ses gares (départ et arrivée, quand elles sont demandées) est en France ou autorisée. */
  const ABROAD_OK = new Set(["LULUX", "DEFGB"]);
  const codeOk = c => c == null || String(c).startsWith("FR") || ABROAD_OK.has(c);
  const inScope = r => codeOk(r[F.originIata]) && codeOk(r[F.destIata]);
  /* Réponses gardées en mémoire pour une durée limitée (les places MAX JEUNE changent vite) : même requête dans ce délai = réponse
     immédiate, sans nouvel appel ; au-delà, ou en cas d'erreur, la requête est refaite. Les lignes renvoyées ne doivent pas être modifiées. */
  const memo = (cache, key, ttl, load) => {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < ttl) return hit.p;
    const p = load().catch(e => { if (cache.get(key)?.p === p) cache.delete(key); throw e; });
    cache.set(key, { at: Date.now(), p });
    return p;
  };
  /* Trains directs d'une recherche : 3 min (ex. aller-retour entre deux recherches récentes) */
  const QC = new Map(), QC_TTL = 3 * 60e3;
  const fetchQuery = params => memo(QC, JSON.stringify(params), QC_TTL, () => fetchAll(params));
  /* Correspondances : tous les trains du jour avec des places MAX JEUNE (≈ 5 000 lignes, ~1 Mo), gardés 10 min par date */
  const DAYC = new Map(), DAYC_TTL = 10 * 60e3;
  const fetchDay = date => memo(DAYC, date, DAYC_TTL, () => fetchAll({
    where: `${F.date}=date'${date}' AND ${F.ok}="OUI"`,
    select: [F.origin, F.originIata, F.dest, F.destIata, F.dep, F.arr, F.train, F.ok, F.entity, F.axe].join(",")
  }));
  /* Villes à plusieurs gares : le jeu de données les nomme toutes « PARIS (intramuros) », « LYON (intramuros) »…
     Seul le code de la gare les distingue : on remplace le nom de ville par celui de la gare. */
  const INTRAMUROS = {
    FRPLY: "PARIS GARE DE LYON", FRPMO: "PARIS MONTPARNASSE", FRPNO: "PARIS NORD", FRPST: "PARIS EST", FRPAZ: "PARIS AUSTERLITZ", FRPBE: "PARIS BERCY",
    FRLPD: "LYON PART DIEU", FRLPE: "LYON PERRACHE", FRLLE: "LILLE EUROPE", FRADJ: "LILLE FLANDRES"
  };
  function realNames(r) {
    for (const [n, c] of [[F.origin, F.originIata], [F.dest, F.destIata]])
      if (/intramuros/i.test(r[n] || "") && INTRAMUROS[r[c]]) r[n] = INTRAMUROS[r[c]];
    return r;
  }
  /* Filtre de l'API sur une gare, ou sur toutes les gares d'une ville (noms séparés par « | »).
     Une gare « intramuros » renommée est cherchée par son code, le jeu de données ne connaissant que le nom de la ville. */
  const CODE_OF = Object.fromEntries(Object.entries(INTRAMUROS).map(([c, n]) => [n, c]));
  const whereStation = (nameField, iataField, v) =>
    `(${v.split("|").map(n => CODE_OF[n] ? `${iataField}="${CODE_OF[n]}"` : `${nameField}="${esc(n)}"`).join(" OR ")})`;
  const esc = s => s.replace(/"/g, '\\"');

  /* ---------- UI ---------- */
  const $ = id => document.getElementById(id);
  /* Dates en heure locale (toISOString passerait en UTC et décalerait d'un jour après minuit) */
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  $("date").min = iso(today); $("date").value = iso(today);
  const max = new Date(today); max.setDate(max.getDate() + 29);   // 30 jours, aujourd'hui compris
  $("date").max = iso(max);

  /* ---------- Calendrier : liste de 30 boutons ----------
     1er bouton « Aujourd'hui », 2e « Demain », puis la date complète (ex. « Lundi 27 décembre ») jusqu'au 30e jour. */
  const fromIso = v => { const [y, m, d] = v.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const fmtLong = d => cap(d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }));
  const DAYS = Array.from({ length: 30 }, (_, i) => {
    const d = addDays(today, i);
    return { k: iso(d), label: i === 0 ? "Aujourd'hui" : i === 1 ? "Demain" : fmtLong(d), rel: i < 2, we: d.getDay() % 6 === 0 };
  });
  const monShort = d => d.toLocaleDateString("fr-FR", { month: "short" });
  /* Le calendrier sert à deux champs : « date » (aller) et « ret » (retour, facultatif : valeur vide = pas de retour) */
  const DP = { id: "date" };
  function setDate(v, id = "date") {
    $(id).value = v;
    const x = DAYS.find(o => o.k === v);
    $(id + "-txt").innerHTML = !v ? "Pas de retour" : x && x.rel ? `<b>${x.label}</b>` : (x ? x.label : fmtLong(fromIso(v)));
    $(id + "-btn").classList.toggle("empty", !v);
    if (id === "ret") $("rtime").hidden = !v;
    /* Le retour ne peut pas précéder l'aller */
    if (id === "date" && $("ret").value && $("ret").value < v) setDate("", "ret");
  }
  function dpRender() {
    const ret = DP.id === "ret", days = ret ? [{ k: "", label: "Pas de retour" }, ...DAYS.filter(o => o.k >= $("date").value)] : DAYS;
    const first = ret ? fromIso($("date").value) : today;
    $("dp-sub").textContent = ret ? "Date du retour" : "Date du voyage";
    $("dp-month").textContent = `${first.getDate()} ${monShort(first)} → ${max.getDate()} ${monShort(max)}`;
    $("dp-foot").textContent = ret ? "À partir du jour de l'aller" : "Les 30 prochains jours";
    const cur = $(DP.id).value;
    $("dp-list").innerHTML = days.map(o => `<button type="button" role="option" class="dp-item${o.k === cur ? " sel" : ""}${o.we ? " we" : ""}" data-k="${o.k}" tabindex="${o.k === cur ? 0 : -1}" aria-selected="${o.k === cur}"><span>${o.label}</span></button>`).join("");
  }
  function dpOpen(on, id = DP.id) {
    const pop = $("dp");
    $(DP.id + "-btn").setAttribute("aria-expanded", "false");
    if (!on) { pop.hidden = true; return; }
    if (!$("tp").hidden) tpOpen(false);
    DP.id = id; dpRender();
    const r = $(id + "-btn").getBoundingClientRect();
    pop.style.left = `${r.left}px`; pop.style.top = `${r.bottom + 8}px`; pop.style.width = `${Math.max(r.width, 280)}px`;
    $("dp-list").style.maxHeight = `${Math.max(180, innerHeight - r.bottom - 120)}px`;
    pop.hidden = false; $(id + "-btn").setAttribute("aria-expanded", "true");
    const sel = pop.querySelector(".dp-item.sel") || pop.querySelector(".dp-item");
    sel?.scrollIntoView({ block: "nearest" }); sel?.focus();
  }
  function dpPick(k) { const id = DP.id; setDate(k, id); dpOpen(false); $(id + "-btn").focus(); }
  for (const id of ["date", "ret"])
    $(id + "-btn").onclick = e => { e.stopPropagation(); dpOpen($("dp").hidden || DP.id !== id, id); };
  $("dp-list").onclick = e => { const b = e.target.closest(".dp-item"); if (b) dpPick(b.dataset.k); };
  $("dp-list").onkeydown = e => {
    const items = [...$("dp-list").children], i = items.indexOf(document.activeElement);
    const j = { ArrowUp: i - 1, ArrowDown: i + 1, Home: 0, End: items.length - 1 }[e.key];
    if (j === undefined || !items[j]) return;
    e.preventDefault(); items[j].focus();
  };
  document.addEventListener("click", e => { if (!$("dp").hidden && !e.target.closest("#dp, #date-btn, #ret-btn")) dpOpen(false); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("dp").hidden) { dpOpen(false); $(DP.id + "-btn").focus(); } });
  addEventListener("resize", () => dpOpen(false));
  setDate("", "ret");
  setDate($("date").value);

  /* Fonds de carte : Carte facile (IGN). Plan désaturé par défaut pour faire ressortir les trajets. */
  const map = new maplibregl.Map({ container: "map", center: [2.5, 46.6], zoom: 5, maxZoom: 18.9, style: mapStyles.desaturated });
  /* Le sélecteur de Carte facile change de fond via map.setStyle : on force un rechargement complet pour que
     « style.load » se déclenche à chaque fois et que nos couches (trajets, réseau, gares) soient recréées. */
  const setStyle0 = map.setStyle.bind(map);
  /* Mode nuit : le fond choisi (dayStyle) est recoloré à la volée par nightStyle() */
  map.setStyle = (style, opts) => { dayStyle = style; return setStyle0(NIGHT && style && typeof style === "object" ? nightStyle(style) : style, { ...opts, diff: false }); };

  /* ---------- Mode nuit ----------
     Aucun fond IGN sombre n'existe : on dérive une version nuit du style vectoriel choisi en recolorant chaque couleur.
     Les aplats clairs (fond, routes, bâti) deviennent bleu nuit en gardant leur ordre de clarté (une route reste plus claire que le fond) ;
     les éléments foncés (textes, contours) deviennent clairs ; les halos des textes deviennent sombres. Photos aériennes : assombries. */
  let NIGHT = false, nightAuto = false, dayStyle = mapStyles.desaturated;
  const THEME = {
    day: { paper: "#ffffff", ring: "#ffffff", casing: "#ffffff", ink: "#1b2a3a", ink2: "#5a6b7d", halo: "rgba(255,255,255,.96)", blue: "#1f4e8c", ok: "#12926b",
      garesStroke: "#8aa0b8", stopStroke: "#5a6b7d", pathGlow: "#16212d", glowOp: .16, ptsText: "#16212d", ptsTextKo: "#8795a5",
      pill: "#ffffff", pillShadow: "rgba(16,24,40,.10)", pillBorder: "rgba(16,24,40,.08)" },
    night: { paper: "#162030", ring: "#0c121b", casing: "#0c121b", ink: "#e3e9f0", ink2: "#9aa8b7", halo: "rgba(10,15,24,.92)", blue: "#7fb0f0", ok: "#3fd0a0",
      garesStroke: "#6f86a3", stopStroke: "#a9b6c4", pathGlow: "#000000", glowOp: .45, ptsText: "#eef2f6", ptsTextKo: "#7d8b9a",
      pill: "#1a2433", pillShadow: "rgba(0,0,0,.45)", pillBorder: "rgba(255,255,255,.08)" }
  };
  const rgb2hsl = (r, g, b) => {
    r /= 255; g /= 255; b /= 255; const M = Math.max(r, g, b), m = Math.min(r, g, b), l = (M + m) / 2, d = M - m;
    if (!d) return [0, 0, l];
    const s = d / (1 - Math.abs(2 * l - 1)), h = M === r ? ((g - b) / d + 6) % 6 : M === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  };
  const hsl2rgb = (h, s, l) => {
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return [r, g, b].map(v => Math.round((v + m) * 255));
  };
  function parseColor(v) {
    if (typeof v !== "string") return null;
    const s = v.trim().toLowerCase(); let m;
    if ((m = /^#([0-9a-f]{3,8})$/.exec(s))) { let h = m[1]; if (h.length < 6) h = [...h].map(c => c + c).join(""); const n = i => parseInt(h.slice(i, i + 2), 16); return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1]; }
    if ((m = /^rgba?\(([^)]+)\)$/.exec(s))) { const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat); return [p[0], p[1], p[2], p[3] ?? 1]; }
    if ((m = /^hsla?\(([^)]+)\)$/.exec(s))) { const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat); return [...hsl2rgb(p[0], p[1] / 100, p[2] / 100), p[3] ?? 1]; }
    return s === "white" ? [255, 255, 255, 1] : s === "black" ? [0, 0, 0, 1] : null;
  }
  /* role : "halo" (halo des textes), "ink" (textes et pictogrammes), "paint" (aplats et traits) */
  function nightColor(v, role) {
    const c = parseColor(v); if (!c) return v;
    const [h, s, l] = rgb2hsl(c[0], c[1], c[2]), grey = s < .08;
    const ink = x => .8 - x * .8, paper = x => .07 + (x - .7) * .42;
    let L;
    if (role === "halo") L = .09;
    else if (role === "ink") L = .9 - l * .5;
    else L = l >= .7 ? paper(l) : l <= .55 ? ink(l) : ink(.55) + (paper(.7) - ink(.55)) * (l - .55) / .15;
    const H = grey ? 218 : h, S = grey ? (L < .4 ? .24 : .12) : Math.min(.55, s * .55);
    const [r, g, b] = hsl2rgb(H, S, Math.max(0, Math.min(1, L)));
    return `rgba(${r},${g},${b},${c[3]})`;
  }
  const mapColors = (v, role) => typeof v === "string" ? nightColor(v, role)
    : Array.isArray(v) ? v.map(x => mapColors(x, role))
    : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mapColors(x, role)])) : v;
  function nightStyle(style) {
    const st = structuredClone(style);
    for (const l of st.layers || []) {
      const p = l.paint || (l.paint = {});
      if (l.type === "raster") Object.assign(p, { "raster-brightness-max": .5, "raster-saturation": -.35, "raster-contrast": .08 });
      for (const k of Object.keys(p)) if (/color$/.test(k))
        p[k] = mapColors(p[k], /^text-halo/.test(k) ? "halo" : /^(text|icon)-/.test(k) ? "ink" : "paint");
    }
    return st;
  }
  /* auto = activé par le choix d'un train de nuit : le mode jour revient quand on choisit un autre train ou ferme la fiche */
  function setNight(on, auto = false) {
    if (!auto) nightAuto = false;
    if (on === NIGHT) return;
    NIGHT = on; nightAuto = on && auto;
    document.body.classList.toggle("night", on);
    $("night").setAttribute("aria-checked", String(on));
    $("night").title = on ? "Désactiver le mode nuit" : "Activer le mode nuit";
    map.setStyle(dayStyle);
  }
  $("night").onclick = () => setNight(!NIGHT);
  map.addControl(new maplibregl.NavigationControl(), "top-right");
  /* rev = true : recherche « toutes les gares de départ → une destination » (dest0). Les résultats sont alors groupés par gare de départ.
     hub() = la gare fixe (départ en mode normal, destination en mode inversé) ; ends(n) = [départ, arrivée] du trajet vers / depuis n. */
  let rev = false, dest0 = null;
  /* Retour (facultatif) : back = trains du retour (de la gare listée vers la gare fixe, ou l'inverse en mode rev), rDate = sa date */
  let back = [], rDate = null;
  /* Correspondances : nCorr = nombre maximal demandé ; dayOut / dayBack = trains du jour (aller / retour) avec places ;
     hubCodes = codes de la gare fixe ; curG / curGB = trains et itinéraires par gare listée (aller / retour), calculés par render() */
  let dayOut = [], dayBack = [], nCorr = 0, hubCodes = [], curG = new Map(), curGB = null;
  /* Gares proches (changement de gare au début ou à la fin du trajet, voir nearOf) :
     HUB_NAMES = gares de la gare fixe ; NEAR_HUB = gares proches de celles-ci ; FAR = gares proches de la destination choisie.
     Valeurs : nom de gare → { hub : gare de référence, min : temps de changement, code } */
  let HUB_NAMES = [], NEAR_HUB = new Map(), FAR = new Map();
  /* Case « Autoriser les changements de gare » (lue à chaque recherche) : sinon, ni gares voisines au départ / à l'arrivée,
     ni changement de gare entre deux trains (correspondances dans la même gare seulement) */
  let xferOn = true;
  const hub = () => rev ? dest0 : origin;
  const ends = n => rev ? [n, dest0] : [origin, n];
  let all = [], origin = null, originIata = null, qDate = null, popup = null, routesData = { type: "FeatureCollection", features: [] }, selected = null, routes = [], pathData = { type: "FeatureCollection", features: [] }, pathOf = null;
  /* Variantes d'itinéraire d'une destination (« » = direct, sinon « Gare X › Gare Y » = gares de correspondance).
     selVar = variante choisie pour le trajet sélectionné (null = toutes affichées) */
  let selVar = null;
  /* Même chose pour le retour : variante du retour choisie dans l'onglet « Retour » (null = toutes) */
  let selBackVar = null;
  /* Train (ou itinéraire) choisi dans la fiche : selTrain = sa clé, trainVar = sa variante, tracée sur la carte avec ses arrêts */
  let selTrain = null, trainVar = null;
  /* Train (ou itinéraire) du retour choisi dans la fiche : selBack = sa clé ; backVar = son tracé (même forme qu'une variante, pour le petit train) */
  let selBack = null, backVar = null;
  /* Aller-retour : onglet affiché dans la fiche (« out » = aller, « back » = retour) */
  let detTab = "out";
  const tkey = x => `${x.no}|${x.dep}`;
  const effVar = () => selVar ?? trainVar;
  /* Clé = gares de correspondance + réseau de chaque train (« f » = TGV / OUIGO, qui peuvent emprunter les LGV ;
     « c » = Intercités de jour ou de nuit, tracés sur les lignes classiques). Ainsi un trajet direct desservi à la fois par des TGV
     et par des Intercités (de nuit) a deux tracés distincts, et un train de nuit n'est jamais dessiné sur une LGV. */
  /* Changement de gare avant le premier train (xs) ou après le dernier (xe) : la gare de départ / d'arrivée réelle fait aussi partie de la clé */
  const vkey = t => `${t.legs ? t.via.join(" › ") : ""}#${(t.legs || [t]).map(l => isIC(l) ? "c" : "f").join("")}${t.xs || t.xe ? `#${t.xs?.b || ""}#${t.xe?.a || ""}` : ""}`;
  const vbase = k => k.split("#")[0];
  const vsort = (a, b) => !vbase(b) - !vbase(a) || a.localeCompare(b);
  /* Libellé : « Direct » ou « via X, Y » (et « depuis X » / « arrivée X » s'il faut changer de gare au début ou à la fin),
     complété du type de train quand deux variantes passent par les mêmes gares */
  const vlabel = (k, keys = []) => {
    const [b, m = "", xs = "", xe = ""] = k.split("#");
    let lab = b ? `via ${b.split(" › ").map(clean).join(", ")}` : "Direct";
    if (xs) lab += ` · depuis ${clean(xs)}`;
    if (xe) lab += ` · arrivée ${clean(xe)}`;
    const same = x => { const p = x.split("#"); return p[0] === b && (p[2] || "") === xs && (p[3] || "") === xe; };
    if (keys.filter(same).length < 2) return lab;
    const net = [...new Set(m.split(""))].length === 1 ? (m[0] === "c" ? "Intercités" : "TGV") : m.split("").map(c => c === "c" ? "Intercités" : "TGV").join(" + ");
    return `${lab} · ${net}`;
  };
  /* Variante à tracer en détail (vitesses, petit train) : celle choisie, ou la seule s'il n'y en a qu'une */
  const curVar = r => !r ? null : effVar() != null ? r.vars.find(v => v.key === effVar()) || null : r.vars.length === 1 ? r.vars[0] : null;

  /* ---------- Trains animés : un dessin par type de train (vue de profil, nez vers la droite, 48 × 48 px) ----------
     Chaque type a une motrice / locomotive (loco-X) et une voiture (car-X) ; les rames TGV et OUIGO ont aussi
     une motrice arrière (rear-X, nez vers la gauche), comme les vraies rames réversibles. */
  const LIVERY = {
    /* TGV INOUI (Duplex) : gris clair, bande basse anthracite, filet prune, deux niveaux de baies vitrées */
    TGV: { body: "#e8ebee", low: "#3b4048", line: "#7d2a5a", win: "#262b33", duplex: true },
    /* OUIGO (Duplex) : bleu clair, bas rose, filet bleu foncé */
    OUIGO: { body: "#2cb3e8", low: "#e5398a", line: "#0b3d91", win: "#123a6b", duplex: true },
    /* Intercités (locomotive électrique + voitures Corail) : blanc, bas bleu foncé, filet turquoise */
    IC: { body: "#f3f5f7", low: "#24356f", line: "#00a0c6", win: "#24303d" },
    /* Intercités de nuit : bleu nuit, filet argenté, petites étoiles sur les voitures-couchettes */
    ICN: { body: "#1f2d5c", low: "#141d3d", line: "#c9d3e3", win: "#e9d98a", night: true }
  };
  /* Contour blanc (lisible sur le fond de carte), remplissage, puis fin liseré sombre */
  function outline(g, path, fill) {
    path(); g.lineJoin = "round"; g.lineWidth = 3; g.strokeStyle = "#fff"; g.stroke();
    g.fillStyle = fill; g.fill();
    g.lineWidth = .7; g.strokeStyle = "rgba(27,42,58,.55)"; g.stroke();
  }
  /* Remplit l'intérieur de la caisse (zone découpée) : bande basse et filet coloré */
  function livery(g, path, L, low = 25, x0 = 0, x1 = 48) {
    g.save(); path(); g.clip();
    g.fillStyle = L.low; g.fillRect(x0, low, x1 - x0, 10);
    g.fillStyle = L.line; g.fillRect(x0, low - 1.4, x1 - x0, 1);
    g.restore();
  }
  const wheels = (g, xs, r = 2.4, y = 33.2) => { g.fillStyle = "#1b2a3a"; g.beginPath(); for (const x of xs) { g.moveTo(x + r, y); g.arc(x, y, r, 0, 7); } g.fill(); };
  const panto = (g, x, y) => { g.strokeStyle = "#1b2a3a"; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 3, y - 3.5); g.lineTo(x + 1, y - 6); g.moveTo(x - 1, y - 6); g.lineTo(x + 4, y - 6); g.stroke(); };
  /* Motrice TGV / OUIGO : long nez profilé, cabine vitrée, pantographe */
  function drawPowerCar(g, L) {
    const body = () => { g.beginPath(); g.moveTo(3, 13); g.lineTo(22, 13); g.bezierCurveTo(34, 13, 43, 19, 46.5, 28.5); g.lineTo(46.5, 31); g.lineTo(3, 31); g.closePath(); };
    outline(g, body, L.body); livery(g, body, L, 26);
    /* Pare-brise courbe le long du nez */
    g.fillStyle = L.win; g.beginPath(); g.moveTo(30, 15.2); g.bezierCurveTo(35.5, 15.6, 39.5, 18.5, 41.6, 22); g.lineTo(34, 22); g.closePath(); g.fill();
    /* Portes et petites baies de la motrice */
    g.fillStyle = L.win; g.fillRect(7, 16.5, 4, 5); g.fillRect(14, 16.5, 4, 5);
    g.fillStyle = "rgba(27,42,58,.35)"; g.fillRect(24, 15, .8, 10.5);
    panto(g, 9, 13); wheels(g, [8, 15, 36, 42]);
  }
  /* Remorque Duplex : deux rangées de baies, bogies partagés aux extrémités (rame articulée) */
  function drawDuplexCar(g, L) {
    const body = () => { rrect(g, 3.5, 11.5, 41, 19.5, 3.5); };
    outline(g, body, L.body); livery(g, body, L, 26.5);
    g.fillStyle = L.win;
    for (let x = 6.5; x < 41; x += 6) { g.fillRect(x, 14, 4, 3.6); g.fillRect(x, 19.4, 4, 3.6); }
    wheels(g, [5.5, 42.5]);
  }
  /* Locomotive électrique (Intercités) : caisse anguleuse, deux pantographes, deux bogies */
  function drawLoco(g, L) {
    const body = () => { g.beginPath(); g.moveTo(3, 12.5); g.lineTo(41, 12.5); g.lineTo(46, 18); g.lineTo(46, 31); g.lineTo(3, 31); g.closePath(); };
    outline(g, body, L.night ? "#2a3a70" : L.body); livery(g, body, L, 24);
    g.fillStyle = L.night ? "#cfd8ea" : L.win; g.beginPath(); g.moveTo(40, 14.5); g.lineTo(44.2, 19.5); g.lineTo(39.5, 19.5); g.closePath(); g.fill();
    g.fillStyle = "rgba(27,42,58,.4)"; g.fillRect(8, 15, 3, 7); g.fillRect(34, 15, 3, 7);
    g.fillStyle = L.night ? "#cfd8ea" : L.win; for (let x = 14; x < 31; x += 5.5) g.fillRect(x, 15.5, 3.2, 2.2);
    panto(g, 10, 12.5); panto(g, 32, 12.5); wheels(g, [8, 14, 34, 40], 2.2);
  }
  /* Voiture Corail (Intercités) ou voiture-couchettes (Intercités de nuit) */
  function drawCoach(g, L) {
    const body = () => { rrect(g, 4, 13, 40, 18, 3.5); };
    outline(g, body, L.body); livery(g, body, L, 25);
    g.fillStyle = "rgba(27,42,58,.35)"; g.fillRect(6.5, 15.5, 2.6, 8.5); g.fillRect(39, 15.5, 2.6, 8.5);   // portes
    g.fillStyle = L.win;
    if (L.night) {
      for (let x = 11.5; x < 37; x += 5.2) g.fillRect(x, 16.5, 3.4, 3.4);   // petites fenêtres des compartiments, éclairées
      g.fillStyle = "#ffd23f"; for (const [x, y] of [[13, 22.4], [22, 21.6], [30, 22.6], [36, 21.4]]) { g.beginPath(); g.arc(x, y, .65, 0, 7); g.fill(); }
    } else for (let x = 12; x < 34; x += 6.6) g.fillRect(x, 16, 4.8, 5.4);
    wheels(g, [9, 14, 34, 39], 2);
  }
  /* Images loco-X / car-X / rear-X pour chaque type (haute définition) */
  function addTrainImages() {
    for (const [k, L] of Object.entries(LIVERY)) {
      const add = (id, draw, flip = false) => map.hasImage(id) || map.addImage(id, canvasImg(48, 48, g => { if (flip) { g.translate(48, 0); g.scale(-1, 1); } draw(g, L); }), { pixelRatio: PR });
      if (L.duplex) { add(`loco-${k}`, drawPowerCar); add(`rear-${k}`, drawPowerCar, true); add(`car-${k}`, drawDuplexCar); }
      else { add(`loco-${k}`, drawLoco); add(`car-${k}`, drawCoach); }
    }
  }
  /* Composition : motrice / locomotive en tête ; motrice arrière en queue pour les rames TGV et OUIGO */
  const trainIcon = (kind, k) => { const K = LIVERY[kind] ? kind : "TGV"; return !k ? `loco-${K}` : k === WAGONS && LIVERY[K].duplex ? `rear-${K}` : `car-${K}`; };
  /* Images dessinées en canvas, en haute définition (pixelRatio 2) */
  const PR = 2;
  function canvasImg(w, h, draw) {
    const c = document.createElement("canvas"); c.width = w * PR; c.height = h * PR;
    const g = c.getContext("2d"); g.scale(PR, PR); draw(g);
    return g.getImageData(0, 0, w * PR, h * PR);
  }
  const rrect = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  /* Étiquette des destinations : pastille blanche arrondie, ombre douce, point de couleur du type de train.
     Seule la partie centrale s'étire (stretchX/Y) pour s'adapter au nom de la gare. */
  const PILL = { M: 7, H: 22, L: 20, R: 10 };   // marge (place de l'ombre), hauteur, partie gauche (point), partie droite
  /* Le point est découpé en parts égales, une par type de train disponible (comme dans la liste).
     Avec les nombres de trains : une petite bulle de notification par type, de sa couleur, alignées en haut à gauche de la pastille
     (la dernière sur le coin, les autres vers la gauche). Les marges haute et gauche sont agrandies pour que les bulles ne soient pas coupées. */
  const BADGE = { B: 9, r: 7, gap: 2 };
  const badgeTxt = n => n > 99 ? "99+" : String(n);
  const badgeW = (g, n) => Math.max(2 * BADGE.r, g.measureText(badgeTxt(n)).width + 7);
  const BADGE_FONT = "700 9px 'Segoe UI', system-ui, sans-serif";
  /* Marge gauche nécessaire pour la rangée de bulles */
  function pillMargins(parts) {
    const withN = parts.filter(p => p.n > 0);
    if (!withN.length) return { X: PILL.M, Y: PILL.M, ws: [] };
    const g = document.createElement("canvas").getContext("2d"); g.font = BADGE_FONT;
    const ws = withN.map(p => badgeW(g, p.n)), left = ws.reduce((s, w) => s + w, 0) + BADGE.gap * (ws.length - 1) - ws[ws.length - 1] / 2;
    return { X: Math.max(BADGE.B, PILL.M, Math.ceil(left + 4)), Y: Math.max(BADGE.B, PILL.M), ws };
  }
  /* parts : [{ c: couleur, n: nombre de trains }] dans l'ordre des types */
  function pillImage(parts) {
    const { M, H, L, R } = PILL, W = L + 2 + R, { X, Y, ws } = pillMargins(parts);
    return canvasImg(W + X + M, H + Y + M, g => {
      /* Ombre en deux couches : large et diffuse, puis courte et nette (effet « carte flottante ») */
      const T = NIGHT ? THEME.night : THEME.day;
      g.fillStyle = T.pill;
      g.shadowColor = T.pillShadow; g.shadowBlur = 8; g.shadowOffsetY = 2.5; rrect(g, X, Y, W, H, H / 2); g.fill();
      g.shadowColor = T.pillShadow; g.shadowBlur = 1.5; g.shadowOffsetY = .5; g.fill();
      g.shadowColor = "transparent"; g.lineWidth = .8; g.strokeStyle = T.pillBorder; g.stroke();
      const dx = X + 10.5, dy = Y + H / 2, k = parts.length, rd = 3.4;
      parts.forEach((p, j) => {
        g.beginPath();
        if (k > 1) { g.moveTo(dx, dy); g.arc(dx, dy, rd, -Math.PI / 2 + j * 2 * Math.PI / k, -Math.PI / 2 + (j + 1) * 2 * Math.PI / k); g.closePath(); }
        else g.arc(dx, dy, rd, 0, 7);
        g.fillStyle = p.c; g.fill();
      });
      /* Halo pâle autour du point */
      g.beginPath(); g.arc(dx, dy, rd + 2.2, 0, 7); g.lineWidth = 2.2; g.strokeStyle = parts.length === 1 ? parts[0].c + "26" : "rgba(16,24,40,.07)"; g.stroke();
      const withN = parts.filter(p => p.n > 0);
      if (!withN.length) return;
      g.font = BADGE_FONT; g.textAlign = "center"; g.textBaseline = "middle";
      const cy = Y + 1; let right = X + 1 + ws[ws.length - 1] / 2;
      for (let j = withN.length - 1; j >= 0; j--) {
        const w = ws[j], cx = right - w / 2;
        g.shadowColor = "rgba(16,24,40,.25)"; g.shadowBlur = 2.5; g.shadowOffsetY = .8;
        rrect(g, cx - w / 2, cy - BADGE.r, w, 2 * BADGE.r, BADGE.r); g.fillStyle = withN[j].c; g.fill();
        g.shadowColor = "transparent"; g.lineWidth = 1.5; g.strokeStyle = T.pill; g.stroke();
        g.fillStyle = "#fff"; g.fillText(badgeTxt(withN[j].n), cx, cy + .5);
        right -= w + BADGE.gap;
      }
    });
  }
  function pillOpts(parts) {
    const { H, L } = PILL, W = L + 2 + PILL.R, { X, Y } = pillMargins(parts);
    return { pixelRatio: PR, stretchX: [[(X + L) * PR, (X + L + 2) * PR]], stretchY: [[(Y + H / 2 - 1) * PR, (Y + H / 2 + 1) * PR]], content: [(X + L - 2) * PR, (Y + 4.5) * PR, (X + W - 9) * PR, (Y + H - 4.5) * PR] };
  }
  /* Gare TGV : carré arrondi bleu, liseré blanc, pictogramme de train */
  function tgvImage() {
    return canvasImg(30, 30, g => {
      g.shadowColor = "rgba(27,42,58,.3)"; g.shadowBlur = 4; g.shadowOffsetY = 1;
      rrect(g, 3, 3, 24, 24, 7); g.fillStyle = "#fff"; g.fill();
      g.shadowColor = "transparent";
      rrect(g, 5, 5, 20, 20, 5.5); g.fillStyle = "#1f4e8c"; g.fill();
      rrect(g, 10, 8.5, 10, 10.5, 2.5); g.fillStyle = "#fff"; g.fill();        // caisse
      g.fillStyle = "#1f4e8c"; g.fillRect(11.6, 10.3, 6.8, 3.4);                // pare-brise
      g.beginPath(); g.arc(12.6, 16.4, 1, 0, 7); g.arc(17.4, 16.4, 1, 0, 7); g.fill(); // phares
      g.strokeStyle = "#fff"; g.lineWidth = 1.4; g.lineCap = "round";
      g.beginPath(); g.moveTo(12, 19.5); g.lineTo(10.6, 21.6); g.moveTo(18, 19.5); g.lineTo(19.4, 21.6); g.stroke();
    });
  }
  const PILL_COL = { TGV: "#14837a", OUIGO: "#c55a86", IC: "#c08a3e", ICN: "#5b62b3", "": "#a9b4bf" };
  function addImages() {
    if (!map.hasImage("gare-tgv")) map.addImage("gare-tgv", tgvImage(), { pixelRatio: PR });
  }
  function addMovers() {
    addTrainImages();
    map.addSource("movers", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({ id: "movers", type: "symbol", source: "movers", layout: { "icon-image": ["get", "icon"], "icon-size": .85, "icon-rotate": ["get", "rot"], "icon-rotation-alignment": "map", "icon-allow-overlap": true, "icon-ignore-placement": true } });
  }
  /* Met en avant le trajet sélectionné, estompe les autres */
  function applyHighlight() {
    if (!map.getLayer("lines")) return;
    const sel = selected, is = (a, b) => ["case", ["==", ["get", "name"], sel], a, b];
    if (!sel && pathOf) { pathOf = null; pathData = { type: "FeatureCollection", features: [] }; map.getSource("path")?.setData(pathData); }
    if (!sel) { setStops([]); if (xferData.features.length || xferReq) showXfers([]); }
    $("speed").style.display = pathOf ? "block" : "none"; ttPlace();
    /* Trajet sélectionné : toutes ses variantes, ou seulement celle choisie ; la variante tracée en détail (path) remplace son trait */
    const vOk = effVar() == null ? true : ["==", ["get", "vk"], effVar()];
    /* Épaisseurs selon le zoom (m = facteur : 1 au zoom 4, 1.5 au zoom 8, 2.2 au zoom 12) */
    const Z = f => ["interpolate", ["linear"], ["zoom"], 4, f(1), 8, f(1.5), 12, f(2.2)];
    const mine = (a, b = 0) => is(pathOf === sel ? 0 : ["case", vOk, a, 0], b);   // trajet sélectionné (variante affichée) / les autres
    /* Trajet sélectionné : les autres trajets sont masqués (filtre : ils ne sont ni dessinés ni cliquables) */
    const only = f => sel ? ["all", f, ["==", ["get", "name"], sel], ["!=", ["get", "part"], "ov"]] : ["all", f, IS_OV];
    for (const [l, f] of [["lines-glow", IS_LINE], ["lines-casing", IS_LINE], ["lines", ["!", IS_CONN]], ["lines-conn-base", IS_CONN], ["lines-conn", IS_CONN]]) if (map.getLayer(l)) map.setFilter(l, only(f));
    for (const l of ["lines", "lines-conn", "lines-conn-base"]) {
      if (!map.getLayer(l)) continue;
      map.setPaintProperty(l, "line-opacity", l === "lines-conn-base" ? (sel ? mine(.3) : .28) : sel ? mine(1) : .92);
      map.setPaintProperty(l, "line-width", Z(m => sel ? is(2.8 * m, .9 * m) : 1.6 * m));
    }
    map.setPaintProperty("lines-casing", "line-opacity", sel ? mine(.95) : .75);
    map.setPaintProperty("lines-casing", "line-width", Z(m => sel ? is(2.8 * m + 3, 0) : 1.6 * m + 2.4));
    /* Halo lumineux : léger sur tous les trajets (GLOW), plus marqué sur le trajet sélectionné */
    map.setPaintProperty("lines-glow", "line-opacity", sel ? mine(.3) : GLOW.op);
    map.setPaintProperty("lines-glow", "line-width", Z(m => sel ? 9 * m : GLOW.w * m));
    map.setPaintProperty("lines-glow", "line-blur", Z(m => sel ? 8 * m : GLOW.blur * m));
    /* Gares de correspondance : seulement celles du trajet sélectionné (et de la variante choisie) */
    for (const l of ["via-pts", "via-label"]) if (map.getLayer(l)) map.setFilter(l, ["all", ["==", ["get", "via"], true], ["==", ["get", "name"], sel || ""], vOk]);
    /* Trajet sélectionné : les autres destinations sont masquées (points et étiquettes), seule la sienne reste */
    for (const l of ["pts", "pts-label"]) if (map.getLayer(l)) map.setFilter(l, sel ? ["all", IS_PT, ["==", ["get", "name"], sel]] : IS_PT);
    map.setPaintProperty("pts", "circle-radius", ["interpolate", ["linear"], ["zoom"], 4, sel ? 5.5 : 3.8, 8, sel ? 6.5 : 4.6, 12, sel ? 8 : 5.6]);
    map.setPaintProperty("pts", "circle-stroke-width", sel ? 2.8 : 2.2);
    map.setLayoutProperty("movers", "icon-size", sel ? is(1.1, .7) : .85);
    map.setPaintProperty("movers", "icon-opacity", sel ? is(1, 0) : 1);
    /* Réseau des gares SNCF (couche facultative) : masqué aussi pendant une sélection */
    for (const l of RAIL_LAYERS.gares) if (map.getLayer(l)) map.setLayoutProperty(l, "visibility", railVis("gares"));
    document.querySelectorAll("#list li").forEach(li => li.classList.toggle("sel", li.dataset.n === sel));
  }
  /* Marges du cadrage de la carte : en haut, on laisse aussi la place au bandeau d'indications */
  const fitPad = p => { const h = $("mtop").offsetHeight; return { top: p + (h ? h + 10 : 0), bottom: p, left: p, right: p }; };
  function focusRoute(n) {
    const r = routes.find(r => r.name === n);
    if (!r) return;
    const v = effVar() != null && curVar(r), b = new maplibregl.LngLatBounds(r.a, r.a).extend(r.b);
    for (const x of v ? [v] : r.vars) { (x.coords || []).forEach(xy => b.extend(xy)); x.steps.slice(1).forEach(([n]) => { const c = locate(n); if (c) b.extend(c); }); }
    map.fitBounds(b, { padding: fitPad(90), maxZoom: 8 });
  }
  /* Animation : un petit train suit le tracé réel de la gare de départ à la destination, en boucle (courte pause à l'arrivée)
     tant que le trajet reste sélectionné */
  let anims = [], shown = false;
  /* Halo des trajets non sélectionnés : épaisseur et flou (px au zoom 4, ×1,5 au zoom 8, ×2,2 au zoom 12), opacité */
  const GLOW = { w: 7, blur: 5, op: .16 };
  const LOOP_PAUSE = 700, WAGONS = 3, CAR_PX = 44;   // nombre de wagons, longueur d'une voiture en pixels (à icon-size 1)
  const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* kinds : type de chaque train de l'itinéraire (train choisi dans la fiche) ; sinon le type prévu pour chaque étape du tracé */
  function launch(name, kinds = null, delay = 0) {
    anims = [];
    const r = routes.find(r => r.name === name), v = curVar(r); if (!r || !r.ok || !v?.coords || REDUCE) return;
    anims = [{ r, v, kinds: kinds || v.steps.map(s => s[3]), start: performance.now() + delay, dur: 1800 + Math.min(v.cum[v.cum.length - 1], 900) * 3 }];
  }
  function pointAt(r, f) {
    const { coords, cum } = r, target = Math.max(0, Math.min(1, f)) * cum[cum.length - 1];
    let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= target) lo = m; else hi = m; }
    const A = coords[lo], B = coords[hi], k = cum[hi] > cum[lo] ? (target - cum[lo]) / (cum[hi] - cum[lo]) : 0;
    return [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k];
  }
  function tick(now) {
    const src = map.getSource("movers");
    if (src && (anims.length || shown)) {
      anims = anims.filter(a => a.r.name === selected && routes.includes(a.r) && (a.v === backVar || curVar(a.r) === a.v));   // arrêt dès que le trajet n'est plus sélectionné
      const feats = [];
      for (const a of anims) {
        const e = now - a.start; if (e < 0) continue;
        const t = (e % (a.dur + LOOP_PAUSE)) / a.dur; if (t > 1) continue;   // pause à l'arrivée avant de repartir
        const f = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        /* Locomotive en tête, puis les wagons à une longueur de voiture chacun, le long du tracé (ils suivent les courbes).
           L'écart est converti de pixels en km selon le zoom ; un wagon pas encore sorti de la gare n'est pas affiché. */
        const L = a.v.cum[a.v.cum.length - 1], head = pointAt(a.v, f);
        const kmPx = 40075 * Math.cos(head[1] * Math.PI / 180) / (512 * 2 ** map.getZoom());
        const gap = CAR_PX * (a.r.name === selected ? 1.1 : .85) * kmPx / L, d = Math.min(.02, gap / 2);
        /* Étape (train) où se trouve la tête : à chaque correspondance, la rame change de dessin */
        const b = a.v.bounds || []; let li = b.findIndex(x => f * L <= x); if (li < 0) li = b.length - 1;
        const kind = a.kinds[Math.max(0, li)];
        for (let k = WAGONS; k >= 0; k--) {
          const fk = f - k * gap; if (fk < 0) continue;
          const P = pointAt(a.v, fk), A = pointAt(a.v, fk - d), B = pointAt(a.v, fk + d);
          const rot = Math.atan2((B[0] - A[0]) * Math.cos((A[1] + B[1]) * Math.PI / 360), B[1] - A[1]) * 180 / Math.PI - 90;
          feats.push({ type: "Feature", properties: { name: a.r.name, rot, icon: trainIcon(kind, k) }, geometry: { type: "Point", coordinates: P } });
        }
      }
      src.setData({ type: "FeatureCollection", features: feats });
      shown = feats.length > 0;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);


  /* Les sources/couches sont perdues à chaque changement de style : on les recrée à chaque "style.load". */
  function addOverlays() {
    const T = NIGHT ? THEME.night : THEME.day;   // couleurs de nos couches selon le mode jour / nuit
    const vis = RAIL.lgv ? "visible" : "none";
    /* Fond « temps de parcours » : sous les noms du fond de carte et sous toutes nos couches */
    ttLayer(ttBefore());
    map.addSource("lgv", { type: "geojson", data: tracesData });
    const fast = [">=", ["get", "vitesse_max_kmh"], 250];   // LGV
    map.addLayer({ id: "lgv-casing", type: "line", source: "lgv", layout: { visibility: vis, "line-join": "round" }, paint: { "line-color": T.casing, "line-width": ["case", fast, 5, 3], "line-opacity": .8 } });
    map.addLayer({ id: "lgv", type: "line", source: "lgv", layout: { visibility: vis, "line-join": "round" }, paint: { "line-color": ["case", fast, "#c0392b", "#7f8c8d"], "line-width": ["case", fast, 2.2, 1.2] } });
    /* Gares voyageurs : petits points discrets à petite échelle, gares TGV mises en avant, noms au zoom (fonds vectoriels) */
    const gvis = railVis("gares"), tgv = ["get", "tgv"];
    map.addSource("gares", { type: "geojson", data: garesData });
    addImages();
    /* Gares : petits points discrets ; les gares TGV deviennent une icône dès le zoom 7 (le point reste, invisible, pour le clic) */
    map.addLayer({
      id: "gares", type: "circle", source: "gares", layout: { visibility: gvis, "circle-sort-key": ["case", tgv, 1, 0] },
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, ["case", tgv, 3, 1.5], 9, ["case", tgv, 6, 3], 13, ["case", tgv, 9, 5]],
        "circle-color": ["case", tgv, "#1f4e8c", T.paper],
        "circle-stroke-color": ["case", tgv, T.ring, T.garesStroke],
        "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 5, ["case", tgv, 1, .8], 10, ["case", tgv, 2, 1.5], 13, 2],
        "circle-opacity": ["interpolate", ["linear"], ["zoom"], 4, ["case", tgv, .7, .6], 6.5, 1, 7, ["case", tgv, 0, 1]],
        "circle-stroke-opacity": ["interpolate", ["linear"], ["zoom"], 4, ["case", tgv, .7, .6], 6.5, 1, 7, ["case", tgv, 0, 1]]
      }
    });
    map.addLayer({
      id: "gares-tgv", type: "symbol", source: "gares", minzoom: 6.5, filter: ["==", tgv, true],
      layout: { visibility: gvis, "icon-image": "gare-tgv", "icon-size": ["interpolate", ["linear"], ["zoom"], 6.5, .6, 9, .85, 13, 1.1], "icon-allow-overlap": true, "icon-ignore-placement": true },
      paint: { "icon-opacity": ["interpolate", ["linear"], ["zoom"], 6.5, 0, 7, 1] }
    });
    /* Polices disponibles dans le fond de carte (pour les étiquettes) : une normale et, si possible, une grasse */
    const st = map.getStyle(), fonts = st.glyphs ? st.layers.map(l => l.layout?.["text-font"]).filter(f => Array.isArray(f) && typeof f[0] === "string") : [];
    const font = fonts.find(f => !/bold|medium|semi|italic/i.test(f[0])) || fonts[0], bold = fonts.find(f => /bold/i.test(f[0]) && !/italic/i.test(f[0])) || fonts.find(f => /medium|semi/i.test(f[0])) || font;
    const italic = fonts.find(f => /italic/i.test(f[0]) && !/bold|medium|semi/i.test(f[0])) || font;
    if (font) map.addLayer({
      id: "gares-label", type: "symbol", source: "gares", minzoom: 7, filter: [">=", ["zoom"], ["case", tgv, 7, 9.5]],
      layout: {
        visibility: gvis, "text-field": ["get", "name"], "text-font": ["case", tgv, ["literal", bold], ["literal", font]],
        "text-size": ["interpolate", ["linear"], ["zoom"], 7, ["case", tgv, 11.5, 10], 13, ["case", tgv, 14, 12]], "text-letter-spacing": .01,
        "text-variable-anchor": ["top", "bottom", "right", "left"], "text-radial-offset": ["case", tgv, 1.25, .8], "text-optional": true, "symbol-sort-key": ["case", tgv, 0, 1]
      },
      paint: { "text-color": ["case", tgv, T.ink, T.ink2], "text-halo-color": T.halo, "text-halo-width": 1.8, "text-halo-blur": .2 }
    });
    /* Gares de départ disponibles (avant toute recherche) : cliquables pour choisir le départ */
    /* Gares principales : gros point bleu ; autres gares : petit point blanc. Villes à plusieurs gares : un point « toutes les gares »
       à petite échelle, remplacé par chacune de ses gares à partir du zoom START_Z. La gare choisie est entourée d'un halo. */
    const sel = ["get", "sel"], main = ["get", "main"];
    const sFilter = ["any", ["all", ["get", "grp"], ["<", ["zoom"], START_Z]], ["all", ["get", "inGrp"], [">=", ["zoom"], START_Z]],
      ["all", ["!", ["get", "grp"]], ["!", ["get", "inGrp"]]]];
    const sR = (m, o) => ["case", main, m, o];
    map.addSource("starts", { type: "geojson", data: startsShown() });
    map.addLayer({
      id: "starts-halo", type: "circle", source: "starts", filter: ["all", sFilter, ["==", sel, true]],
      paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, sR(13, 10), 8, sR(17, 14), 12, sR(20, 16)], "circle-color": "rgba(18,146,107,.25)", "circle-stroke-color": "#12926b", "circle-stroke-width": 2 }
    });
    map.addLayer({
      id: "starts", type: "circle", source: "starts", filter: sFilter, layout: { "circle-sort-key": ["+", ["case", main, 1, 0], ["case", sel, 2, 0]] },
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, sR(7, 3.5), 8, sR(10, 6), 12, sR(12, 8)],
        "circle-color": ["case", main, "#1f4e8c", T.paper], "circle-stroke-color": ["case", main, T.ring, T.blue],
        "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 4, sR(2, 1.6), 8, sR(3, 2.6)]
      }
    });
    if (font) map.addLayer({
      id: "starts-label", type: "symbol", source: "starts", filter: ["all", sFilter, ["any", main, sel, [">=", ["zoom"], 6]]],
      layout: {
        "text-field": ["get", "name"], "text-font": ["case", main, ["literal", bold], ["literal", font]],
        "text-size": ["interpolate", ["linear"], ["zoom"], 4, sR(11.5, 10), 9, sR(14, 12), 13, sR(15, 13.5)],
        "text-variable-anchor": ["top", "bottom", "right", "left"], "text-radial-offset": sR(1.2, .9), "text-optional": true,
        "symbol-sort-key": ["case", sel, 0, main, 1, 2]
      },
      paint: { "text-color": ["case", sel, T.ok, main, T.blue, T.ink], "text-halo-color": T.halo, "text-halo-width": 1.8 }
    });
    map.addSource("routes", { type: "geojson", data: dedupLines(routesData) });
    /* Trajets : trait plein pour un trajet direct, pointillés pour un itinéraire avec correspondance(s) */
    const isConn = ["==", ["get", "conn"], true];
    /* Halo diffus (trajet sélectionné), liseré blanc sous les traits pleins, puis le trait ; épaisseurs selon le zoom (voir applyHighlight) */
    map.addLayer({ id: "lines-glow", type: "line", source: "routes", filter: ["all", ["==", ["geometry-type"], "LineString"], IS_OV], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": KCOL, "line-width": 12, "line-blur": 8, "line-opacity": 0 } });
    map.addLayer({ id: "lines-casing", type: "line", source: "routes", filter: ["all", ["==", ["geometry-type"], "LineString"], IS_OV], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": T.casing, "line-width": 4, "line-opacity": .75 } });
    map.addLayer({ id: "lines", type: "line", source: "routes", filter: ["all", ["!", isConn], IS_OV], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": KCOL, "line-width": 1.6, "line-opacity": .92 } });
    /* Correspondances : même liseré que les traits pleins, trait de fond très léger (continuité du tracé),
       puis tirets fins et nets par-dessus (bouts droits : pas d'aspect « perles ») */
    const CONN_DASH = [2.6, 1.8];
    map.addLayer({ id: "lines-conn-base", type: "line", source: "routes", filter: ["all", isConn, IS_OV], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": KCOL, "line-width": 1.6, "line-opacity": .28 } });
    map.addLayer({ id: "lines-conn", type: "line", source: "routes", filter: ["all", isConn, IS_OV], layout: { "line-cap": "butt", "line-join": "round" }, paint: { "line-color": KCOL, "line-width": 1.6, "line-opacity": .95, "line-dasharray": CONN_DASH } });
    /* Animation d'apparition des trajets (voir growRoutes) : source légère à part, mêmes styles que les traits ci-dessus.
       Seules ces lignes sont recalculées à chaque image ; gares et étiquettes ne bougent pas. */
    map.addSource("grow", { type: "geojson", data: EMPTY_FC, tolerance: 1, buffer: 16 });
    const GZ = f => ["interpolate", ["linear"], ["zoom"], 4, f(1), 8, f(1.5), 12, f(2.2)];
    map.addLayer({ id: "grow-glow", type: "line", source: "grow", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": KCOL, "line-width": GZ(m => GLOW.w * m), "line-blur": GZ(m => GLOW.blur * m), "line-opacity": GLOW.op } });
    map.addLayer({ id: "grow-casing", type: "line", source: "grow", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": T.casing, "line-width": GZ(m => 1.6 * m + 2.4), "line-opacity": .75 } });
    map.addLayer({ id: "grow", type: "line", source: "grow", filter: ["!", isConn], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": KCOL, "line-width": GZ(m => 1.6 * m), "line-opacity": .92 } });
    map.addLayer({ id: "grow-conn-base", type: "line", source: "grow", filter: isConn, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": KCOL, "line-width": GZ(m => 1.6 * m), "line-opacity": .28 } });
    map.addLayer({ id: "grow-conn", type: "line", source: "grow", filter: isConn, layout: { "line-cap": "butt", "line-join": "round" }, paint: { "line-color": KCOL, "line-width": GZ(m => 1.6 * m), "line-opacity": .95, "line-dasharray": CONN_DASH } });
    const isPt = IS_PT, isVia = ["==", ["get", "via"], true];
    /* Gares de correspondance : petit point cerclé de sombre, affichées seulement pour le trajet sélectionné (filtre posé par applyHighlight) */
    map.addLayer({ id: "via-pts", type: "circle", source: "routes", filter: isVia, paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 3.4, 10, 5], "circle-color": T.paper, "circle-stroke-width": 2, "circle-stroke-color": T.ink } });
    if (font) map.addLayer({
      id: "via-label", type: "symbol", source: "routes", filter: isVia,
      layout: { "text-field": ["get", "label"], "text-font": ["literal", bold], "text-size": ["interpolate", ["linear"], ["zoom"], 4, 10.5, 10, 12], "text-letter-spacing": .02, "text-variable-anchor": ["right", "left", "top", "bottom"], "text-radial-offset": .75, "text-optional": true },
      paint: { "text-color": T.ink, "text-halo-color": T.halo, "text-halo-width": 1.6, "text-halo-blur": .4 }
    });
    /* Destinations : anneau de la couleur du train, centre blanc */
    map.addLayer({ id: "pts", type: "circle", source: "routes", filter: isPt, paint: { "circle-radius": 4, "circle-color": T.paper, "circle-stroke-width": 2.2, "circle-stroke-color": KCOL, "circle-pitch-alignment": "map" } });
    /* Noms des destinations dans une pastille blanche (point de couleur = type de train), placée à côté de la gare */
    if (font) map.addLayer({
      id: "pts-label", type: "symbol", source: "routes", filter: isPt,
      layout: {
        "text-field": ["get", "label"], "text-font": ["literal", bold], "text-size": ["interpolate", ["linear"], ["zoom"], 4, 11, 8, 12, 12, 13.5], "text-letter-spacing": .01,
        "icon-image": ["get", "pill"], "icon-text-fit": "both", "icon-text-fit-padding": [0, 0, 0, 0],
        "text-variable-anchor-offset": ["left", [1.6, 0], "right", [-1, 0], "top", [0, 1.3], "bottom", [0, -1.3]],
        "text-justify": "auto", "symbol-sort-key": ["case", ["get", "ok"], 0, 1], "text-padding": 3, "icon-padding": 3
      },
      paint: { "text-color": ["case", ["get", "ok"], T.ptsText, T.ptsTextKo] }
    });
    map.addSource("path", { type: "geojson", data: pathData });
    /* Trajet détaillé (vitesses) : ombre diffuse, liseré blanc, trait coloré selon la vitesse */
    const pw = (a, b, c) => ["interpolate", ["linear"], ["zoom"], 4, a, 8, b, 12, c];
    map.addLayer({ id: "path-glow", type: "line", source: "path", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": T.pathGlow, "line-width": pw(10, 14, 20), "line-blur": pw(6, 9, 12), "line-opacity": T.glowOp, "line-translate": [0, 1.5] } }, "via-pts");
    map.addLayer({ id: "path-casing", type: "line", source: "path", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": T.casing, "line-width": pw(6, 8, 11) } }, "via-pts");
    map.addLayer({ id: "path", type: "line", source: "path", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": ["interpolate", ["linear"], ["get", "v"], 30, "#440154", 100, "#3b528b", 160, "#21908d", 230, "#5dc863", 320, "#fde725"], "line-width": pw(3.4, 4.6, 6.5) } }, "via-pts");
    /* Changement de gare (voir showXfers) : métro / RER à la couleur de la ligne sur un liseré, liaisons à pied en pointillés gris, nom de la ligne le long du trait */
    map.addSource("xfer", { type: "geojson", data: xferData });
    const isWalk = ["==", ["get", "walk"], true], xw = (a, b, c) => ["interpolate", ["linear"], ["zoom"], 8, a, 12, b, 15, c];
    map.addLayer({ id: "xfer-casing", type: "line", source: "xfer", filter: ["!", isWalk], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": T.casing, "line-width": xw(5, 7, 10) } }, "via-pts");
    map.addLayer({ id: "xfer", type: "line", source: "xfer", filter: ["!", isWalk], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": ["get", "color"], "line-width": xw(3, 4.5, 6.5) } }, "via-pts");
    map.addLayer({ id: "xfer-walk", type: "line", source: "xfer", filter: isWalk, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": T.ink, "line-opacity": .7, "line-width": xw(1.6, 2.2, 3), "line-dasharray": [0.1, 1.8] } }, "via-pts");
    if (font) map.addLayer({
      id: "xfer-label", type: "symbol", source: "xfer", filter: ["!", isWalk],
      layout: { "symbol-placement": "line-center", "text-field": ["get", "label"], "text-font": ["literal", bold], "text-size": xw(10, 12, 13), "text-allow-overlap": true },
      paint: { "text-color": ["get", "color"], "text-halo-color": T.halo, "text-halo-width": 2 }
    });
    /* Arrêts intermédiaires des trains du trajet tracé : mini ronds blancs, noms en italique */
    map.addSource("stops", { type: "geojson", data: stopsData });
    map.addLayer({
      id: "stops-pts", type: "circle", source: "stops",
      paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3.4, 10, 5], "circle-color": T.paper, "circle-stroke-color": T.ink, "circle-stroke-width": 2 }
    }, "via-pts");
    if (font) map.addLayer({
      id: "stops-label", type: "symbol", source: "stops",
      layout: {
        "text-field": ["get", "label"], "text-font": ["literal", italic], "text-size": ["interpolate", ["linear"], ["zoom"], 5, 11.5, 10, 13],
        "text-letter-spacing": .02, "text-variable-anchor": ["right", "left", "top", "bottom"], "text-radial-offset": .55, "text-optional": true
      },
      paint: { "text-color": T.ink, "text-halo-color": T.halo, "text-halo-width": 2, "text-halo-blur": .2 }
    }, "via-pts");
  }
  /* Pastilles créées à la demande d'après leur nom : « pill-TGV3.OUIGO2 » (types et nombres de trains), « pill-TGV.IC » (sans bulle), « pill- » (complet) */
  map.on("styleimagemissing", e => {
    if (!e.id.startsWith("pill-") || map.hasImage(e.id)) return;
    const parts = e.id.slice(5).split(".").map(x => /^([A-Z]+)(\d*)$/.exec(x)).filter(Boolean).map(m => ({ c: PILL_COL[m[1]] || PILL_COL[""], n: +m[2] || 0 }));
    const ps = parts.length ? parts : [{ c: PILL_COL[""], n: 0 }];
    map.addImage(e.id, pillImage(ps), pillOpts(ps));
  });
  map.on("style.load", () => { addOverlays(); addMovers(); applyHighlight(); });
  /* Seules les gares sont cliquables (pas les tronçons) */
  /* Le point et la pastille du nom ouvrent tous deux la fiche de la destination */
  const PTS = () => ["pts", "pts-label"].filter(l => map.getLayer(l));
  /* Clic déjà traité par une destination : le gestionnaire général de la carte doit l'ignorer. Sinon, quand la fiche ouverte
     passe la carte en mode nuit (train de nuit choisi d'office), le style est rechargé, la couche « pts » n'existe plus
     au moment du gestionnaire général, qui croit à un clic dans le vide et referme aussitôt la fiche. */
  let ptsClick = null;
  for (const l of ["pts", "pts-label"]) {
    map.on("click", l, e => { ptsClick = e.originalEvent; show(e.features[0].properties.name, true); });
    map.on("mouseenter", l, () => map.getCanvas().style.cursor = "pointer");
    map.on("mouseleave", l, () => map.getCanvas().style.cursor = "");
  }
  /* Tracés du trajet sélectionné, quand plusieurs variantes sont affichées : cliquables (zone de clic élargie) */
  const LINES = () => ["lines", "lines-conn"].filter(l => map.getLayer(l));
  function selVarHit(p) {
    const r = selected && effVar() == null && routes.find(r => r.name === selected);
    if (!r || r.vars.length < 2 || !LINES().length) return null;
    return map.queryRenderedFeatures([[p.x - 5, p.y - 5], [p.x + 5, p.y + 5]], { layers: LINES() }).find(f => f.properties.name === selected) || null;
  }
  map.on("mousemove", e => {
    if (!routes.length) return;
    const c = map.getCanvas().style;
    if (selVarHit(e.point)) { c.cursor = "pointer"; map._varHover = true; }
    else if (map._varHover) { c.cursor = ""; map._varHover = false; }
  });
  /* Carte d'accueil : un clic sur une gare de départ la sélectionne dans le formulaire */
  const START_L = () => ["starts", "starts-label"].filter(l => map.getLayer(l));
  for (const l of ["starts", "starts-label"]) {
    map.on("mouseenter", l, () => map.getCanvas().style.cursor = "pointer");
    map.on("mouseleave", l, () => map.getCanvas().style.cursor = "");
  }
  map.on("click", e => {
    const s = startsOn && START_L().length && map.queryRenderedFeatures(e.point, { layers: START_L() })[0];
    if (s) {
      popup?.remove();
      $("origin").value = s.properties.v; $("origin").dispatchEvent(new Event("change"));
      $("status").textContent = `Départ : ${s.properties.name}. Choisissez une date puis lancez la recherche.`;
      updHint(s.properties.name);
      return;
    }
    if (ptsClick === e.originalEvent) return;
    /* Clic sur l'une des variantes du trajet sélectionné (toutes affichées) : on ne garde qu'elle */
    const ln = !(map.getLayer("pts") && map.queryRenderedFeatures(e.point, { layers: PTS() }).length) && selVarHit(e.point);
    if (ln) { pickVar(selected, ln.properties.vk); return; }
    if (!map.getLayer("pts") || !map.queryRenderedFeatures(e.point, { layers: PTS() }).length) {
      closeDetail(); popup?.remove();
      /* Clic sur une gare de la liste (hors destinations) : petite fiche */
      const g = map.getLayer("gares") && map.queryRenderedFeatures(e.point, { layers: ["gares-tgv", "gares"].filter(l => map.getLayer(l)) })[0];
      if (g) popup = new maplibregl.Popup({ maxWidth: "240px", className: "gare-pop" }).setLngLat(g.geometry.coordinates)
        .setHTML(`<b>${g.properties.name}</b>${g.properties.tgv ? '<span class="badge" style="background:#1f4e8c">Gare TGV</span>' : ""}<br><span class="t">${clean(g.properties.commune || "")}</span>`).addTo(map);
    }
  });
  for (const l of ["gares", "gares-tgv"]) {
    map.on("mouseenter", l, () => { if (map.getCanvas().style.cursor !== "pointer") map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", l, () => map.getCanvas().style.cursor = "");
  }

  /* Liste des destinations. Départ « toutes les gares » : pas d'entrée « Toutes les destinations » (plusieurs départs ET plusieurs
     arrivées sont interdits), mais une invite non choisissable tant qu'aucune destination n'est sélectionnée. */
  const ALL_O = "*";
  let NAMES = [];
  /* Villes à plusieurs gares : une entrée « Ville (toutes les gares) » regroupe leurs gares, qui restent aussi choisissables seules */
  const MULTI = ["PARIS", "LYON", "LILLE", "MARSEILLE", "AVIGNON"];
  const cityGroups = names => MULTI.map(city => {
    const members = [...new Set(names.filter(n => { const k = norm(n); return k === city || k.startsWith(city + " "); }))];
    return members.length > 1 ? { city, label: `${city[0]}${city.slice(1).toLowerCase()} (toutes les gares)`, members } : null;
  }).filter(Boolean);
  const attr = s => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  /* Destination « toutes les gares » d'une ville : valeur = noms des gares séparés par « | » */
  function destOptions(names, keep) {
    const sel = $("dest"), allO = $("origin").value === ALL_O, groups = cityGroups(names);
    sel.innerHTML = (allO ? `<option value="" disabled>Choisissez une destination</option>` : `<option value="">Toutes les destinations</option>`)
      + groups.map(g => `<option value="${attr(g.members.join("|"))}">${g.label}</option>`).join("")
      + names.map(n => `<option>${n}</option>`).join("");
    /* Choix conservé : même gare, ou même ville (« toutes les gares », même si les gares desservies ont changé) */
    const kg = keep?.includes("|") && cityGroups(keep.split("|"))[0]?.label;
    const o = [...sel.options].find(o => !o.disabled && (o.value === keep || (kg && o.text === kg))) || [...sel.options].find(o => o.value === "");
    if (o) o.selected = true;
  }
  $("origin").addEventListener("change", () => { destOptions(NAMES, $("dest").value); refreshStarts(); });

  /* Gares de départ du jeu de données, placées sur la carte d'accueil (gares seules, pas les regroupements « toutes les gares ») */
  let startsData = EMPTY_FC, startsOn = true;
  const START_Z = 9;   // zoom à partir duquel une ville à plusieurs gares montre chacune d'elles
  /* Gares principales (même liste que la liste déroulante), comparées au début du nom */
  const MAIN = ["PARIS", "LYON", "MARSEILLE", "LILLE", "BORDEAUX", "TOULOUSE", "NANTES", "STRASBOURG", "RENNES", "MONTPELLIER",
    "NICE", "AEROPORT CDG", "ROISSY", "CHARLES DE GAULLE", "MARNE LA VALLEE", "AVIGNON", "AIX EN PROVENCE", "TOURS", "DIJON", "LE MANS", "ANGERS", "GRENOBLE"];
  const isMain = t => { const n = norm(t); return MAIN.some(k => n === k || n.startsWith(k + " ")) || /CDG|ROISSY|CHARLES DE GAULLE/.test(n); };
  function startsShown() {
    if (!startsOn) return EMPTY_FC;
    const v = $("origin").value, codes = v.split(",");
    return { ...startsData, features: startsData.features.map(f => ({ ...f, properties: { ...f.properties, sel: f.properties.grp ? f.properties.v === v : codes.includes(f.properties.v) } })) };
  }
  const refreshStarts = () => map.getSource("starts")?.setData(startsShown());
  async function buildStarts() {
    await Promise.all([garesReady, tracesReady]);
    const os = [...$("origin").options].filter(o => o.value && o.value !== ALL_O);
    const opts = os.filter(o => !o.value.includes(",")), groups = os.filter(o => o.value.includes(","));
    await geocodeMissing(opts.map(o => o.text));
    const inGrp = new Set(groups.flatMap(g => g.value.split(",")));
    const pt = (c, props) => ({ type: "Feature", properties: { grp: false, inGrp: false, ...props }, geometry: { type: "Point", coordinates: c } });
    const feats = opts.map(o => ({ o, c: locate(o.text) })).filter(x => x.c)
      .map(({ o, c }) => pt(c, { v: o.value, name: clean(o.text), main: isMain(o.text), inGrp: inGrp.has(o.value) }));
    /* Ville « toutes les gares » : au centre de ses gares */
    for (const g of groups) {
      const cs = feats.filter(f => g.value.split(",").includes(f.properties.v)).map(f => f.geometry.coordinates);
      if (cs.length) feats.push(pt([cs.reduce((a, c) => a + c[0], 0) / cs.length, cs.reduce((a, c) => a + c[1], 0) / cs.length],
        { v: g.value, name: `${clean(g.text)} · toutes les gares`, main: true, grp: true }));
    }
    startsData = { type: "FeatureCollection", features: feats };
    refreshStarts();
  }

  async function loadOrigins() {
    try {
      const rows = (await fetchAll({ select: `${F.originIata},${F.origin}`, group_by: `${F.originIata},${F.origin}`, order_by: F.origin })).filter(r => r[F.originIata]);
      /* Villes à plusieurs gares : l'entrée « toutes les gares » regroupe leurs codes */
      const groups = cityGroups(rows.map(r => r[F.origin]))
        .map(g => [[...new Set(rows.filter(r => g.members.includes(r[F.origin])).map(r => r[F.originIata]))].join(","), g.label]);
      /* « * » = toutes les gares de départ (une seule destination est alors exigée) */
      $("origin").innerHTML = [[ALL_O, "Toutes les gares de départ"], ...groups, ...rows.map(r => [r[F.originIata], r[F.origin]])].map(([v, t]) => `<option value="${v}">${t}</option>`).join("");
      const p = [...$("origin").options].find(o => norm(o.text).startsWith("PARIS")); if (p) p.selected = true;
      /* Destination choisissable tout de suite : toutes les gares (remplacée après la recherche par les destinations desservies) */
      NAMES = [...new Set(rows.map(r => r[F.origin]))];
      destOptions(NAMES, "");
      buildStarts(); renderRecent();
    } catch (e) { $("origin").innerHTML = "<option>Erreur de chargement</option>"; $("status").textContent = e.message; }
  }

  /* Aller et retour le même jour : on ne garde que les combinaisons faisables.
     - aller : uniquement les trains arrivant le jour même et avant le dernier départ retour ;
     - retour : uniquement les trains partant après l'arrivée du premier train aller.
     Si aucune combinaison n'existe, les deux listes sont vides (la gare n'est alors pas disponible). */
  const mins = h => { const [a, b] = h.split(":"); return +a * 60 + +b; };
  function sameDay(out, bk) {
    if (!bk || rDate !== qDate) return [out, bk];
    const o = out.filter(t => mins(t.arr) >= mins(t.dep));   // arrivée le lendemain : pas de retour possible le jour même
    const firstArr = Math.min(...o.map(t => mins(t.arr)));
    const b = bk.filter(t => mins(t.dep) > firstArr);
    const lastDep = Math.max(...b.map(t => mins(t.dep)));
    return [o.filter(t => mins(t.arr) < lastDep), b];
  }
  /* Trains groupés par gare listée (destination, ou départ en mode rev). Pour le retour (isBack), cette gare est l'autre extrémité. */
  const toTrain = r => {
    const x = { dep: r[F.dep], arr: r[F.arr], no: r[F.train], dIata: r[F.destIata], from: r[F.origin], to: r[F.dest], oIata: r[F.originIata], ok: isOk(r[F.ok]), entity: r[F.entity], axe: r[F.axe] };
    x.kind = kindOf(x); return x;
  };
  function group(rows = all, isBack = false) {
    const g = new Map();
    for (const r of rows) {
      const t = toTrain(r), n = tagXfer(t, isBack); if (!g.has(n)) g.set(n, []);
      g.get(n).push(t);
    }
    return g;
  }
  /* Gares voisines (changement de gare en métro, RER, à pied…, mêmes règles que pour les correspondances : xferFor) */
  const catalog = () => [...$("origin").options].filter(o => o.value && o.value !== ALL_O && !o.value.includes(",")).map(o => ({ name: o.text, code: o.value }));
  function nearOf(hubs, exclude = new Set()) {
    const hp = hubs.map(n => [n, locate(n)]).filter(([, c]) => c), out = new Map();
    for (const s of catalog()) {
      if (hubs.includes(s.name) || exclude.has(s.name)) continue;
      const c = locate(s.name); if (!c) continue;
      let best = null;
      for (const [h, q] of hp) { const m = xferFor(kmBetween(q, c), isIdf(h) && isIdf(s.name)); if (m != null && (!best || m < best.min)) best = { hub: h, min: m, code: s.code }; }
      if (best) out.set(s.name, best);
    }
    return out;
  }
  /* Train (ou itinéraire) partant / arrivant à une gare voisine plutôt qu'à la gare fixe ou à la destination choisie :
     on note le changement de gare à faire avant (xs) ou après (xe) ; renvoie la gare sous laquelle le ranger.
     La gare fixe est le départ du train à l'aller (mode normal) et au retour (mode « toutes les gares de départ »). */
  function tagXfer(t, isBack) {
    const hubIsOrigin = rev === isBack;
    let n = hubIsOrigin ? t.to : t.from;
    const hx = NEAR_HUB.get(hubIsOrigin ? t.from : t.to);
    if (hx) { if (hubIsOrigin) t.xs = { a: hx.hub, b: t.from, min: hx.min }; else t.xe = { a: t.to, b: hx.hub, min: hx.min }; }
    const fx = FAR.get(n);
    if (fx) { if (hubIsOrigin) t.xe = { a: t.to, b: fx.hub, min: fx.min }; else t.xs = { a: fx.hub, b: t.from, min: fx.min }; n = fx.hub; }
    return n;
  }
  /* Ligne du jeu de données à écarter : depuis une gare voisine de la gare fixe vers cette gare ou une autre voisine (aucun intérêt) */
  const xferRowOk = (allO, isBack) => r => {
    const hubIsOrigin = allO === isBack, h = hubIsOrigin ? r[F.origin] : r[F.dest], o = hubIsOrigin ? r[F.dest] : r[F.origin];
    return !NEAR_HUB.has(h) || !(NEAR_HUB.has(o) || HUB_NAMES.includes(o));
  };

  /* ---------- Correspondances ----------
     Itinéraires de 2 ou 3 trains (1 ou 2 correspondances), chacun avec des places MAX JEUNE, changement dans la même gare
     (même code) avec au moins MIN_CORR minutes. Recherche par couches (1 train, puis 2, puis 3) : à chaque gare on ne garde
     que les itinéraires non dominés (aucun autre ne part plus tard ET n'arrive plus tôt avec autant de trains ou moins).
     Les trajets directs entrent dans la comparaison : une correspondance n'apparaît que si elle apporte un horaire utile.
     fwd = true : depuis les gares « starts » ; false : vers ces gares (retour, ou mode « toutes les gares de départ »).
     Seul le dernier train peut arriver le lendemain (train de nuit). */
  const MIN_CORR = 15;
  let maxWait = Infinity;   // attente maximale à une correspondance, en minutes (choisie dans le formulaire)
  /* Plages horaires de départ (aller, retour), en minutes, choisies dans le formulaire : s'appliquent au départ du premier train */
  let depWin = [0, Infinity], retWin = [0, Infinity];
  /* Durée maximale d'un trajet, en minutes (jauge du formulaire ; Infinity = sans limite) */
  let maxDur = Infinity;
  const durOk = x => durMin(x) <= maxDur;
  const inWin = (h, w = depWin) => { const m = mins(String(h || "0:0")); return m >= w[0] && m <= w[1]; };
  const waitOk = (w, min = MIN_CORR) => w >= min && w <= maxWait;
  /* Changement de gare dans une même ville (Paris Nord → Paris Gare de Lyon, Lille Flandres → Lille Europe, Tours → Saint-Pierre-des-Corps…) :
     permis seulement entre gares à moins de XFER_KM à vol d'oiseau, donc pas vers une gare TGV excentrée
     (Aix-en-Provence TGV, Besançon TGV, Lyon Saint-Exupéry…). Temps minimal entre les deux trains : à pied jusqu'à 1 km,
     au-delà métro / tram / navette, marge comprise. */
  const XFER_KM = 6;
  const xferMin = km => km <= 1 ? MIN_CORR + Math.round(12 * km) : 25 + Math.round(5 * km);   // ex. Lille Flandres → Europe 20 min, Paris Nord → Gare de Lyon 47 min
  const kmBetween = (p, q) => Math.hypot((p[0] - q[0]) * Math.cos((p[1] + q[1]) * Math.PI / 360), p[1] - q[1]) * 111.2;
  /* Île-de-France : toutes les gares parisiennes et celles de la banlieue desservies par les TGV (Marne-la-Vallée, Massy,
     aéroport CDG, Versailles) sont reliées entre elles (RER, Transilien), quelle que soit la distance ; au-delà de XFER_KM,
     temps de changement plus long (ex. Paris → CDG ~75 min, Massy → CDG ~95 min, marge comprise). */
  const IDF = /^(PARIS|MARNE LA VALLEE|MASSY|VERSAILLES)\b|\bCDG\b|\bROISSY\b|CHARLES DE GAULLE/;
  const isIdf = name => IDF.test(nn(name || ""));
  const xferFor = (km, idf) => km <= XFER_KM ? xferMin(km) : idf ? 40 + Math.round(1.5 * km) : null;
  /* Temps de changement entre deux gares (par leur nom), null si trop éloignées ou non localisées */
  const xferBetween = (a, b) => { const p = locate(a), q = locate(b); return p && q ? xferFor(kmBetween(p, q), isIdf(a) && isIdf(b)) : null; };
  /* Comment changer de gare : trajets conseillés entre les gares les plus courantes (sinon, seul le lien d'itinéraire est proposé) */
  const XID = [[/^PARIS NORD/, "PN"], [/^PARIS EST/, "PE"], [/^PARIS (GARE DE )?LYON/, "PL"], [/^PARIS BERCY/, "PB"], [/^PARIS AUSTERLITZ/, "PA"],
  [/^PARIS MONTPARNASSE VAUGIRARD/, "PMV"], [/^PARIS MONTPARNASSE/, "PM"], [/^PARIS ST LAZARE/, "PSL"], [/\bCDG\b|\bROISSY\b|CHARLES DE GAULLE/, "CDG"],
  [/^MARNE LA VALLEE/, "MLV"], [/^MASSY/, "MAS"], [/^VERSAILLES/, "VER"], [/^LILLE FLANDRES/, "LFL"], [/^LILLE EUROPE/, "LEU"],
  [/^LYON PART DIEU/, "LPD"], [/^LYON PERRACHE/, "LPE"], [/^AVIGNON TGV/, "AVT"], [/^AVIGNON CENTRE/, "AVC"], [/^TOURS$/, "TRS"],
  [/^ST PIERRE DES CORPS/, "SPC"], [/^MARSEILLE ST CHARLES/, "MSC"], [/^MARSEILLE BLANCARDE/, "MBL"],
  [/^MONTPELLIER ST ROCH/, "MSR"], [/^MONTPELLIER SUD DE FRANCE/, "MSF"]];
  /* Hors Île-de-France : conseils valables dans les deux sens */
  const XHOW = {
    "LFL|LEU": "À pied, ~10 min (ou métro 2, 1 station).",
    "LPD|LPE": "Tram T1 direct, ~20 min.",
    "AVT|AVC": "TER navette direct (« virgule »), ~5 min.",
    "TRS|SPC": "Navette TER directe entre Tours et Saint-Pierre-des-Corps (départs très fréquents), ~5 min.",
    "MSR|MSF": "Tramway ligne 1 direct entre la gare Saint-Roch et la gare Sud de France (terminus), ~25 min ; ticket TaM à prendre en station.",
    "MBL|MSC": "TER direct (~5 min) ou métro 1."
  };
  /* Île-de-France : le conseil est écrit à partir des étapes de XPATH, dans le sens du trajet (a → b) ; XNOTE complète ou remplace
     (liaisons à pied, autres possibilités) */
  const XNOTE = {
    "PN|PE": "À pied, ~10 min.", "PL|PA": "À pied par le pont Charles-de-Gaulle, ~10 min.",
    "PM|PMV": "Même gare : le hall 3 (Vaugirard) est à ~10 min à pied des halls 1 et 2.",
    "MAS|MAS": "Massy TGV et Massy-Palaiseau sont voisines : ~5 min à pied.",
    "PL|PB": "Ou ~10 min à pied.", "PL|PM": "Ou bus 91 direct.", "PA|PM": "Ou bus 91 direct."
  };
  /* Stations IDFM situées dans (ou reliées à) chaque gare SNCF : ailleurs, une liaison à pied est indiquée */
  const XST = {
    PN: ["Gare du Nord", "Magenta"], PE: ["Gare de l'Est"], PL: ["Gare de Lyon"], PB: ["Bercy"], PA: ["Gare d'Austerlitz", "Paris Austerlitz"],
    PM: ["Montparnasse-Bienvenüe", "Montparnasse"], PMV: [], PSL: ["Saint-Lazare", "Haussmann-Saint-Lazare"], CDG: ["Aéroport Charles De Gaulle 2-TGV"],
    MLV: ["Marne-la-Vallée-Chessy"], MAS: ["Massy-Palaiseau"], VER: ["Versailles-Chantiers"]
  };
  /* Pastilles des lignes, aux couleurs officielles (Île-de-France Mobilités) : M + numéro dans un rond, RER / Train + lettre dans un carré */
  const LINE_COL = {
    "METRO 1": "#ffbe00", "METRO 4": "#a0006e", "METRO 5": "#ff5a00", "METRO 6": "#82dc73", "METRO 13": "#82c8e6", "METRO 14": "#640082",
    "RER A": "#eb2132", "RER B": "#5091cb", "RER C": "#ffcc30", "RER D": "#008b5b", "RER E": "#b94e9a", "TRAIN N": "#00b297", "TRAIN V": "#9f9825"
  };
  const inkOn = hex => { const n = parseInt(hex.slice(1), 16), L = (.299 * (n >> 16) + .587 * (n >> 8 & 255) + .114 * (n & 255)) / 255; return L > .6 ? "#1b1b1b" : "#fff"; };
  function lineBadge(line) {
    const [mode, id] = line.split(" "), c = LINE_COL[line] || "#6b7a8a", k = mode === "METRO" ? "m" : mode === "RER" ? "rer" : "tr";
    const lab = mode === "METRO" ? "M" : mode === "RER" ? "RER" : "Train";
    return `<span class="ln ln-${k}" title="${lineLabel(line)}"><i>${lab}</i><b style="background:${c};color:${inkOn(c)}">${id}</b></span>`;
  }
  const xid = n => XID.find(([re]) => re.test(nn(n || "")))?.[1];
  /* Comment aller de la gare a à la gare b (HTML), dans ce sens */
  function xferHow(a, b) {
    const x = xid(a), y = xid(b); if (!x || !y) return null;
    const note = XNOTE[`${x}|${y}`] || XNOTE[`${y}|${x}`] || "";
    const steps = xferSteps(x, y);
    if (!steps) return XHOW[`${x}|${y}`] || XHOW[`${y}|${x}`] || null;
    if (!steps.length) return note || "À pied.";
    const at = (code, s) => (XST[code] || []).some(n => nn(n) === nn(s)), parts = [];
    if (!at(x, steps[0][1])) parts.push(`à pied jusqu'à ${steps[0][1]}`);
    steps.forEach(([line, s, e], i) => {
      if (i && s !== steps[i - 1][2]) parts.push(`correspondance à pied jusqu'à ${s}`);
      parts.push(`${lineBadge(line)} jusqu'à ${e}`);
    });
    if (!at(y, steps[steps.length - 1][2])) parts.push(`à pied jusqu'à ${clean(b)}`);
    const txt = parts.join(", puis ");
    return `${txt[0] === "<" ? txt : txt[0].toUpperCase() + txt.slice(1)}.${note ? ` ${note}` : ""}`;
  }
  /* Lien d'itinéraire en transports en commun entre deux gares (Google Maps) */
  const xferLink = (a, b) => `https://www.google.com/maps/dir/?api=1&travelmode=transit&origin=${encodeURIComponent(`Gare ${clean(a)}`)}&destination=${encodeURIComponent(`Gare ${clean(b)}`)}`;
  /* ---------- Changement de gare sur la carte (Île-de-France) ----------
     Trajet en métro / RER / Transilien tracé sur les vraies lignes, aux couleurs officielles (données ouvertes Île-de-France Mobilités :
     tracés du réseau ferré et emplacement des gares, chargés à la demande ligne par ligne). Étapes : [ligne, station de départ, station d'arrivée],
     dans le sens de la clé ; les liaisons à pied (gare SNCF ↔ station, entre deux stations) sont ajoutées automatiquement. */
  const CDG2 = "Aéroport Charles De Gaulle 2-TGV", MLVC = "Marne-la-Vallée-Chessy", MASP = "Massy-Palaiseau", CHLH = "Châtelet-Les Halles", MB = "Montparnasse-Bienvenüe";
  const XPATH = {
    "PN|PE": [], "PL|PA": [], "PM|PMV": [], "MAS|MAS": [],
    "PN|PL": [["RER D", "Gare du Nord", "Gare de Lyon"]],
    "PN|PB": [["RER D", "Gare du Nord", "Gare de Lyon"], ["METRO 14", "Gare de Lyon", "Bercy"]],
    "PN|PA": [["METRO 5", "Gare du Nord", "Gare d'Austerlitz"]],
    "PN|PM": [["METRO 4", "Gare du Nord", MB]], "PN|PMV": [["METRO 4", "Gare du Nord", MB]],
    "PN|PSL": [["RER E", "Magenta", "Haussmann-Saint-Lazare"]],
    "PE|PL": [["METRO 5", "Gare de l'Est", "Bastille"], ["METRO 1", "Bastille", "Gare de Lyon"]],
    "PE|PB": [["METRO 5", "Gare de l'Est", "Bastille"], ["METRO 1", "Bastille", "Gare de Lyon"], ["METRO 14", "Gare de Lyon", "Bercy"]],
    "PE|PA": [["METRO 5", "Gare de l'Est", "Gare d'Austerlitz"]],
    "PE|PM": [["METRO 4", "Gare de l'Est", MB]], "PE|PMV": [["METRO 4", "Gare de l'Est", MB]],
    "PE|PSL": [["RER E", "Magenta", "Haussmann-Saint-Lazare"]],
    "PL|PB": [["METRO 14", "Gare de Lyon", "Bercy"]],
    "PL|PM": [["METRO 14", "Gare de Lyon", "Châtelet"], ["METRO 4", "Châtelet", MB]], "PL|PMV": [["METRO 14", "Gare de Lyon", "Châtelet"], ["METRO 4", "Châtelet", MB]],
    "PL|PSL": [["METRO 14", "Gare de Lyon", "Saint-Lazare"]],
    "PB|PA": [["METRO 14", "Bercy", "Gare de Lyon"]],
    "PB|PM": [["METRO 6", "Bercy", MB]], "PB|PMV": [["METRO 6", "Bercy", MB]],
    "PB|PSL": [["METRO 14", "Bercy", "Saint-Lazare"]],
    "PA|PM": [["METRO 5", "Gare d'Austerlitz", "Place d'Italie"], ["METRO 6", "Place d'Italie", MB]], "PA|PMV": [["METRO 5", "Gare d'Austerlitz", "Place d'Italie"], ["METRO 6", "Place d'Italie", MB]],
    "PA|PSL": [["METRO 14", "Gare de Lyon", "Saint-Lazare"]],
    "PM|PSL": [["METRO 13", MB, "Saint-Lazare"]], "PMV|PSL": [["METRO 13", MB, "Saint-Lazare"]],
    "CDG|PN": [["RER B", CDG2, "Gare du Nord"]], "CDG|PE": [["RER B", CDG2, "Gare du Nord"]],
    "CDG|PL": [["RER B", CDG2, CHLH], ["RER A", CHLH, "Gare de Lyon"]],
    "CDG|PB": [["RER B", CDG2, CHLH], ["METRO 14", "Châtelet", "Bercy"]],
    "CDG|PA": [["RER B", CDG2, "Gare du Nord"], ["METRO 5", "Gare du Nord", "Gare d'Austerlitz"]],
    "CDG|PM": [["RER B", CDG2, "Denfert-Rochereau"], ["METRO 4", "Denfert-Rochereau", MB]],
    "CDG|PSL": [["RER B", CDG2, "Gare du Nord"], ["RER E", "Magenta", "Haussmann-Saint-Lazare"]],
    "CDG|MLV": [["RER B", CDG2, CHLH], ["RER A", CHLH, MLVC]],
    "CDG|MAS": [["RER B", CDG2, MASP]],
    "MLV|PL": [["RER A", MLVC, "Gare de Lyon"]], "MLV|PA": [["RER A", MLVC, "Gare de Lyon"]],
    "MLV|PB": [["RER A", MLVC, "Gare de Lyon"], ["METRO 14", "Gare de Lyon", "Bercy"]],
    "MLV|PN": [["RER A", MLVC, CHLH], ["RER B", CHLH, "Gare du Nord"]], "MLV|PE": [["RER A", MLVC, CHLH], ["RER B", CHLH, "Gare du Nord"]],
    "MLV|PM": [["RER A", MLVC, CHLH], ["METRO 4", "Châtelet", MB]],
    "MLV|PSL": [["RER A", MLVC, "Auber"]],
    "MLV|MAS": [["RER A", MLVC, CHLH], ["RER B", CHLH, MASP]],
    "MAS|PN": [["RER B", MASP, "Gare du Nord"]], "MAS|PE": [["RER B", MASP, "Gare du Nord"]],
    "MAS|PL": [["RER B", MASP, CHLH], ["RER A", CHLH, "Gare de Lyon"]],
    "MAS|PB": [["RER B", MASP, CHLH], ["METRO 14", "Châtelet", "Bercy"]],
    "MAS|PA": [["RER C", MASP, "Paris Austerlitz"]],
    "MAS|PM": [["RER B", MASP, "Denfert-Rochereau"], ["METRO 4", "Denfert-Rochereau", MB]],
    "MAS|PSL": [["RER B", MASP, CHLH], ["METRO 14", "Châtelet", "Saint-Lazare"]],
    "VER|PM": [["TRAIN N", "Versailles-Chantiers", "Montparnasse"]],
    "VER|MAS": [["TRAIN V", "Versailles-Chantiers", MASP]]
  };
  /* Étapes de x vers y (codes XID), dans le bon sens ; Versailles ↔ Paris : ligne N jusqu'à Montparnasse puis la suite */
  function xferSteps(x, y) {
    if (!x || !y) return null;
    const rev = s => s && [...s].reverse().map(([l, a, b]) => [l, b, a]);
    const get = (p, q) => XPATH[`${p}|${q}`] || rev(XPATH[`${q}|${p}`]) || null;
    let s = get(x, y);
    if (!s && x === "VER" && y !== "PM") { const m = get("PM", y); if (m) s = [...get("VER", "PM"), ...m]; }
    if (!s && y === "VER" && x !== "PM") { const m = get(x, "PM"); if (m) s = [...m, ...get("PM", "VER")]; }
    return s;
  }
  const IDFM = "https://data.iledefrance-mobilites.fr/api/explore/v2.1/catalog/datasets/";
  const IDFM_LINES = new Map();   // ligne → Promise<{ V: sommets, adj, color, st: nom normalisé → [lon, lat] }>
  function idfmLine(line) {
    if (!IDFM_LINES.has(line)) IDFM_LINES.set(line, (async () => {
      const w = encodeURIComponent(`res_com="${line}"`), get = u => fetch(u).then(r => r.ok ? r.json() : Promise.reject(new Error(r.status)));
      const [tr, gs] = await Promise.all([get(`${IDFM}traces-du-reseau-ferre-idf/exports/geojson?select=colourweb_hexa,geo_shape&where=${w}`),
      get(`${IDFM}emplacement-des-gares-idf/exports/json?select=nom_gares,geo_point_2d&where=${w}`)]);
      /* Graphe de la ligne : chaque sommet des tracés, reliés le long des tronçons ; les bouts de tronçons sont raccordés aux sommets à moins de 30 m */
      const V = [], adj = [], ends = [], link = (a, b) => { const d = kmBetween(V[a], V[b]); adj[a].push([b, d]); adj[b].push([a, d]); };
      let color = null;
      for (const f of tr.features || []) {
        color ||= f.properties?.colourweb_hexa;
        const g = f.geometry; if (!g) continue;
        for (const s of g.type === "MultiLineString" ? g.coordinates : g.type === "LineString" ? [g.coordinates] : []) {
          const b = V.length; s.forEach(c => { V.push(c); adj.push([]); });
          for (let i = 1; i < s.length; i++) link(b + i - 1, b + i);
          ends.push(b, b + s.length - 1);
        }
      }
      const cell = (x, y) => `${x},${y}`, C = .001, grid = new Map();
      V.forEach((c, i) => { const k = cell(Math.floor(c[0] / C), Math.floor(c[1] / C)); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); });
      for (const e of ends) {
        const cx = Math.floor(V[e][0] / C), cy = Math.floor(V[e][1] / C);
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const j of grid.get(cell(cx + dx, cy + dy)) || []) if (j !== e && kmBetween(V[e], V[j]) < .03) link(e, j);
      }
      const st = new Map(gs.map(s => [nn(s.nom_gares || ""), [s.geo_point_2d.lon, s.geo_point_2d.lat]]));
      return { V, adj, color: color ? `#${color}` : "#6b7a8a", st };
    })().catch(e => { IDFM_LINES.delete(line); throw e; }));
    return IDFM_LINES.get(line);
  }
  /* Tracé de la ligne entre deux de ses stations (plus court chemin sur le graphe de la ligne) */
  function rideCoords(g, a, b) {
    const pa = g.st.get(nn(a)), pb = g.st.get(nn(b)); if (!pa || !pb || !g.V.length) return null;
    const near = p => { let bi = 0, bd = Infinity; g.V.forEach((c, i) => { const d = kmBetween(c, p); if (d < bd) { bd = d; bi = i; } }); return bi; };
    const s = near(pa), t = near(pb), dist = new Map([[s, 0]]), prev = new Map(), h = new Heap(); h.push([0, s]);
    while (h.size) {
      const [d, u] = h.pop(); if (d > dist.get(u)) continue; if (u === t) break;
      for (const [v, w] of g.adj[u]) if (d + w < (dist.get(v) ?? Infinity)) { dist.set(v, d + w); prev.set(v, u); h.push([d + w, v]); }
    }
    if (!dist.has(t)) return null;
    const out = [pb]; for (let x = t; x !== undefined; x = prev.get(x)) out.push(g.V[x]); out.push(pa);
    return out.reverse();
  }
  const lineLabel = l => l.replace(/^METRO /, "M").replace(/^TRAIN /, "Ligne ").replace(/^TRAM /, "T");
  /* Traits du changement de gare a → b : trajets en transports (couleur de la ligne) et liaisons à pied (pointillés gris).
     Sans trajet connu (hors Île-de-France, ou données indisponibles) : simple liaison en pointillés entre les deux gares. */
  async function transferFeats(a, b) {
    const pA = locate(a), pB = locate(b), feats = [];
    const walk = (p, q, min = .08) => { if (p && q && kmBetween(p, q) > min) feats.push({ type: "Feature", properties: { walk: true }, geometry: { type: "LineString", coordinates: [p, q] } }); };
    const steps = xferSteps(xid(a), xid(b));
    try {
      if (!steps) throw 0;
      let cur = pA;
      for (const [line, s, e] of steps) {
        const g = await idfmLine(line), c = rideCoords(g, s, e); if (!c) throw 0;
        walk(cur, c[0]); feats.push({ type: "Feature", properties: { color: g.color, label: lineLabel(line) }, geometry: { type: "LineString", coordinates: c } });
        cur = c[c.length - 1];
      }
      walk(cur, pB);
      return feats;
    } catch { feats.length = 0; walk(pA, pB, 0); return feats; }
  }
  let xferData = EMPTY_FC, xferReq = 0;
  const setXfer = fc => { xferData = fc; map.getSource("xfer")?.setData(fc); };
  /* pairs : [[gare d'arrivée du train précédent, gare de départ du suivant], …] (seulement les changements de gare) */
  async function showXfers(pairs) {
    const id = ++xferReq; setXfer(EMPTY_FC);
    if (!pairs.length) return;
    const feats = (await Promise.all(pairs.map(([a, b]) => transferFeats(a, b)))).flat();
    if (id === xferReq) setXfer({ type: "FeatureCollection", features: feats });
  }
  /* code de gare → [{ k: code d'une gare proche, min: temps de changement }], calculé une fois par liste de trains */
  const NEAR = new WeakMap();
  function nearStations(day) {
    if (!xferOn) return new Map();
    if (NEAR.has(day)) return NEAR.get(day);
    const pos = new Map();
    for (const t of day) for (const [k, n] of [[t.oIata, t.from], [t.dIata, t.to]]) if (k && !pos.has(k)) { const c = locate(n); pos.set(k, c && { c, idf: isIdf(n) }); }
    const ks = [...pos].filter(([, v]) => v), near = new Map();
    for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) {
      const [a, p] = ks[i], [b, q] = ks[j], min = xferFor(kmBetween(p.c, q.c), p.idf && q.idf); if (min == null) continue;
      if (!near.has(a)) near.set(a, []); if (!near.has(b)) near.set(b, []);
      near.get(a).push({ k: b, min }); near.get(b).push({ k: a, min });
    }
    NEAR.set(day, near); return near;
  }
  const night = t => mins(t.arr) < mins(t.dep);
  const absArr = t => mins(t.arr) + (night(t) ? 1440 : 0);
  const itin = legs => {
    const a = legs[0], b = legs[legs.length - 1];
    return { legs, dep: a.dep, arr: b.arr, no: legs.map(l => l.no).join(" + "), from: a.from, to: b.to, oIata: a.oIata, dIata: b.dIata, ok: true, kind: bestKind(legs), via: legs.slice(1).map(l => l.from) };
  };
  function connections(day, starts, fwd, maxC, ks) {
    const S = new Set(starts), idx = new Map();
    for (const t of day) {
      if (ks && !ks.has(t.kind)) continue;
      const k = fwd ? t.oIata : t.dIata; if (!idx.has(k)) idx.set(k, []); idx.get(k).push(t);
    }
    const end = L => fwd ? L.legs[L.legs.length - 1].dIata : L.legs[0].oIata;
    const beats = (b, a) => b.dep >= a.dep && b.arr <= a.arr && b.legs.length <= a.legs.length;   // b vaut au moins a
    const fronts = new Map();
    const add = L => {
      const s = end(L), f = fronts.get(s) || [];
      if (f.some(b => beats(b, L))) return;
      fronts.set(s, [...f.filter(b => !beats(L, b)), L]);
    };
    const mk = legs => ({ legs, dep: mins(legs[0].dep), arr: absArr(legs[legs.length - 1]) });
    /* Gares où l'on peut prendre le train suivant depuis la gare k : elle-même, ou une gare proche (temps de changement en plus) */
    const near = nearStations(day), from = k => [[k, MIN_CORR], ...(near.get(k) || []).map(o => [o.k, o.min])];
    let layer = [];
    for (const s of S) for (const t of idx.get(s) || []) if (!S.has(fwd ? t.dIata : t.oIata)) { const L = mk([t]); add(L); layer.push(L); }
    for (let c = 1; c <= maxC; c++) {
      /* Itinéraires partiels à prolonger : sans attente max., seuls les non dominés (un autre arrivant plus tôt peut prendre
         les mêmes trains suivants). Avec une attente max., arriver plus tôt peut faire rater la correspondance : on ne compare
         alors que les itinéraires qui atteignent la gare de correspondance à la même heure (le meilleur de chaque groupe). */
      let alive;
      if (maxWait === Infinity) alive = layer.filter(L => fronts.get(end(L))?.includes(L));
      else {
        const best = new Map();
        for (const L of layer) {
          const k = `${end(L)}|${fwd ? L.arr : L.dep}`, b = best.get(k);
          if (!b || (fwd ? L.dep > b.dep : L.arr < b.arr)) best.set(k, L);
        }
        alive = [...best.values()];
      }
      const next = [];
      for (const L of alive) {
        const seen = new Set([...L.legs.map(l => l.oIata), ...L.legs.map(l => l.dIata)]);
        if (fwd) {
          const last = L.legs[L.legs.length - 1]; if (night(last)) continue;
          for (const [x, need] of from(last.dIata)) {
            if (x !== last.dIata && (seen.has(x) || S.has(x))) continue;
            for (const t of idx.get(x) || [])
              if (t.no !== last.no && waitOk(mins(t.dep) - mins(last.arr), need) && !seen.has(t.dIata) && !S.has(t.dIata)) { const N = mk([...L.legs, t]); add(N); next.push(N); }
          }
        } else {
          const first = L.legs[0];
          for (const [x, need] of from(first.oIata)) {
            if (x !== first.oIata && (seen.has(x) || S.has(x))) continue;
            for (const t of idx.get(x) || [])
              if (t.no !== first.no && !night(t) && waitOk(mins(first.dep) - mins(t.arr), need) && !seen.has(t.oIata) && !S.has(t.oIata)) { const N = mk([t, ...L.legs]); add(N); next.push(N); }
          }
        }
      }
      layer = next;
    }
    /* Gare listée → itinéraires avec correspondance(s), rangés par heure de départ */
    const out = new Map();
    for (const f of fronts.values()) for (const L of f) {
      if (L.legs.length < 2) continue;
      const it = itin(L.legs), n = fwd ? it.to : it.from;
      if (!out.has(n)) out.set(n, []); out.get(n).push(it);
    }
    for (const l of out.values()) l.sort((a, b) => a.dep.localeCompare(b.dep));
    return out;
  }
  /* Trains directs + itinéraires avec correspondance, par gare listée */
  function withConn(g, isBack, ks) {
    if (!nCorr) return g;
    const day = isBack ? dayBack : dayOut, m = new Map([...g].map(([n, l]) => [n, [...l]]));
    for (const its of connections(day, hubCodes, rev === isBack, nCorr, ks).values()) for (const it of its) {
      if (!inWin(it.dep, isBack ? retWin : depWin) || !durOk(it)) continue;   // départ du premier train dans la plage horaire
      const n = tagXfer(it, isBack);   // départ / arrivée à une gare voisine : changement de gare noté, rangé sous la gare de référence
      if (!m.has(n)) m.set(n, []); m.get(n).push(it);
    }
    return m;
  }
  const durMin = x => absArr(x) - mins(x.dep);
  /* Étapes du tracé d'une gare listée : trajet direct si possible, sinon l'itinéraire le plus court ([gare A, gare B, lignes classiques]) */
  const isIC = t => t.kind === "IC" || t.kind === "ICN";
  function stepsOf(name, pool) {
    const direct = pool.filter(t => !t.legs);
    if (direct.length || !pool.length) {
      /* Départ / arrivée à une gare voisine (changement de gare avant ou après) : le tracé part de / arrive à la gare réelle du train */
      const [A, B] = ends(name), d = direct[0];
      return [[d?.xs ? d.from : A, d?.xe ? d.to : B, direct.every(isIC), bestKind(direct)]];
    }
    const b = pool.reduce((a, t) => durMin(t) < durMin(a) ? t : a);
    return b.legs.map(l => [l.from, l.to, isIC(l), l.kind]);
  }
  /* Tronçons du graphe pour chaque étape (un tableau par train), null si une étape est introuvable */
  function stepsParts(steps) {
    if (!G.ready) return null;
    const parts = steps.map(([A, B, c]) => gRoute(A, B, c));
    return parts.every(p => p?.length) ? parts : null;
  }
  /* Trait(s) d'une variante : un seul pour un trajet direct ; avec correspondance(s), un par train, chacun à la couleur
     de son train (kinds[i]) — ex. TGV puis Intercités : vert puis orange */
  /* Tronçons communs à plusieurs trajets (ex. Paris → Lyon pour Lyon, Marseille, Nice…) : sur la vue d'ensemble, un tronçon
     de même couleur et même style (plein / pointillés) n'est dessiné qu'une fois, sinon les pointillés superposés et décalés
     se brouillent. Chaque trait est découpé en morceaux ne gardant que les segments pas encore dessinés (part « ov ») ;
     le trait complet reste disponible pour la sélection (part « sel »). Un trait sans segment déjà dessiné est gardé tel quel. */
  const IS_OV = ["!=", ["get", "part"], "sel"];
  function dedupLines(fc) {
    const seen = new Set(), out = [], r = ([x, y]) => `${x.toFixed(5)},${y.toFixed(5)}`;
    for (const f of fc.features) {
      if (f.geometry.type !== "LineString") { out.push(f); continue; }
      const c = f.geometry.coordinates, p = f.properties, style = `${p.kind}|${p.ok ? 1 : 0}|${p.conn ? 1 : 0}|`;
      const runs = []; let cur = null, dup = false;
      for (let i = 1; i < c.length; i++) {
        const a = r(c[i - 1]), b = r(c[i]), k = style + (a < b ? a + ";" + b : b + ";" + a);
        if (seen.has(k)) { dup = true; cur = null; continue; }
        seen.add(k);
        if (!cur) { cur = { i: i - 1, c: [c[i - 1]] }; runs.push(cur); }
        cur.c.push(c[i]);
      }
      if (!dup) { out.push(f); continue; }
      out.push({ ...f, properties: { ...p, part: "sel" } });
      /* off : distance (km) entre le début du trait et celui du morceau (sert à l'animation d'apparition) */
      const cum = cumul(c);
      for (const run of runs) out.push({ type: "Feature", properties: { ...p, part: "ov", off: cum[run.i] }, geometry: { type: "LineString", coordinates: run.c } });
    }
    return { type: "FeatureCollection", features: out };
  }

  function lineFeats(props, parts, kinds) {
    if (parts.length < 2 || !props.ok) return [{ type: "Feature", properties: props, geometry: { type: "LineString", coordinates: pathGeo(parts.flat()).coords } }];
    return parts.map((p, i) => ({ type: "Feature", properties: { ...props, kind: kinds[i] || props.kind, leg: i }, geometry: { type: "LineString", coordinates: pathGeo(p).coords } }));
  }

  /* Gare de départ : marqueur dédié (élément HTML, conservé lors des changements de fond de plan) */
  let originMarker = null;
  function setOriginMarker(xy) {
    originMarker?.remove(); originMarker = null;
    if (!xy) return;
    const el = document.createElement("div"); el.className = "origin-mk";
    el.innerHTML = `<span class="origin-pulse"></span><span class="origin-pulse p2"></span><span class="origin-pin"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="13" rx="3"/><path d="M5 10h14M9 20l-2 2M15 20l2 2M9 13h.01M15 13h.01"/></svg></span><span class="origin-lbl"><small>${rev ? "Arrivée" : "Départ"}</small>${clean(hub())}</span>`;
    originMarker = new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat(xy).addTo(map);
  }

  /* ---------- Fond « temps de parcours » ----------
     Après une recherche, la carte est teintée selon la durée du trajet le plus court vers chaque gare (0 à la gare fixe) :
     les valeurs sont interpolées entre les gares (pondération inverse au carré de la distance), et la teinte s'estompe
     loin de toute gare connue. L'image est calculée en projection Mercator, ce qui la cale exactement sur la carte. */
  /* Vert → jaune → orange → rouge, avec une large plage de jaune pour une transition progressive (la barre de la légende en est tirée) */
  const TT_RAMP = [[0, [26, 152, 80]], [.18, [102, 189, 75]], [.34, [180, 220, 60]], [.46, [240, 230, 50]], [.58, [255, 205, 45]],
    [.7, [253, 165, 55]], [.84, [242, 105, 45]], [1, [215, 48, 39]]];
  const TT_NEAR = 70, TT_FAR = 170;   // km : teinte pleine jusqu'à TT_NEAR de la gare la plus proche, nulle au-delà de TT_FAR
  /* Contour de la France métropolitaine (continent, Corse), simplifié à ~2 km : la teinte ne déborde ni en mer ni chez les voisins.
     Source : france-geojson (G. David), d'après IGN / Etalab — Licence Ouverte. */
  const FRANCE = [[[7.13,47.503],[6.986,47.492],[6.999,47.452],[6.941,47.433],[6.879,47.358],[7.012,47.373],[7.062,47.344],[7.046,47.327],[6.943,47.288],[6.955,47.244],[6.74,47.108],[6.692,47.067],[6.7,47.039],[6.433,46.929],[6.465,46.89],[6.435,46.801],[6.459,46.788],[6.111,46.576],[6.156,46.545],[6.064,46.416],[6.17,46.368],[6.103,46.285],[6.124,46.251],[5.978,46.217],[5.964,46.197],[5.992,46.187],[5.956,46.132],[6.127,46.14],[6.277,46.216],[6.307,46.255],[6.238,46.277],[6.304,46.366],[6.39,46.34],[6.513,46.405],[6.723,46.408],[6.806,46.38],[6.771,46.355],[6.865,46.283],[6.804,46.204],[6.797,46.139],[6.898,46.123],[6.873,46.052],[6.952,46.05],[7.044,45.924],[6.94,45.847],[6.819,45.836],[6.808,45.725],[6.935,45.647],[7.001,45.64],[6.978,45.59],[7.0,45.504],[7.184,45.407],[7.114,45.329],[7.138,45.257],[7.067,45.21],[6.966,45.208],[6.895,45.168],[6.894,45.137],[6.768,45.16],[6.627,45.101],[6.672,45.021],[6.743,45.016],[6.751,44.906],[6.863,44.851],[7.007,44.839],[7.0,44.789],[7.066,44.714],[7.077,44.681],[6.957,44.67],[6.932,44.573],[6.854,44.529],[6.937,44.439],[6.893,44.421],[6.887,44.361],[6.993,44.281],[7.008,44.236],[7.16,44.206],[7.28,44.141],[7.34,44.146],[7.358,44.118],[7.685,44.174],[7.667,44.133],[7.714,44.065],[7.665,44.031],[7.653,43.975],[7.495,43.862],[7.53,43.788],[7.413,43.725],[7.244,43.689],[7.206,43.646],[7.158,43.654],[7.122,43.559],[6.952,43.535],[6.947,43.484],[6.892,43.429],[6.734,43.406],[6.71,43.345],[6.584,43.277],[6.697,43.266],[6.62,43.161],[6.556,43.188],[6.496,43.151],[6.405,43.149],[6.369,43.137],[6.366,43.089],[6.208,43.116],[6.16,43.089],[6.157,43.028],[6.117,43.039],[6.126,43.078],[6.031,43.077],[5.921,43.124],[5.917,43.086],[5.829,43.049],[5.814,43.107],[5.695,43.144],[5.653,43.187],[5.601,43.163],[5.531,43.212],[5.341,43.215],[5.373,43.245],[5.324,43.357],[5.038,43.329],[4.968,43.426],[4.931,43.433],[4.864,43.406],[4.855,43.333],[4.662,43.346],[4.563,43.372],[4.588,43.401],[4.562,43.443],[4.166,43.472],[4.101,43.554],[4.011,43.552],[3.662,43.392],[3.51,43.272],[3.387,43.284],[3.263,43.229],[3.093,43.069],[3.043,42.96],[3.037,42.626],[3.057,42.537],[3.138,42.515],[3.174,42.436],[3.085,42.426],[3.041,42.473],[2.947,42.482],[2.841,42.459],[2.799,42.419],[2.674,42.405],[2.672,42.341],[2.578,42.358],[2.54,42.334],[2.257,42.438],[2.023,42.355],[1.986,42.362],[1.935,42.454],[1.731,42.493],[1.736,42.551],[1.786,42.574],[1.726,42.59],[1.738,42.611],[1.549,42.656],[1.48,42.651],[1.477,42.615],[1.44,42.604],[1.358,42.716],[1.162,42.711],[1.107,42.772],[0.924,42.79],[0.708,42.861],[0.659,42.839],[0.645,42.783],[0.671,42.69],[0.436,42.69],[0.36,42.723],[0.293,42.675],[0.26,42.716],[0.176,42.737],[-0.011,42.684],[-0.102,42.722],[-0.16,42.797],[-0.313,42.849],[-0.393,42.8],[-0.51,42.825],[-0.551,42.778],[-0.725,42.891],[-0.752,42.967],[-0.946,42.954],[-1.113,43.022],[-1.264,43.045],[-1.309,43.069],[-1.28,43.118],[-1.346,43.091],[-1.355,43.028],[-1.441,43.046],[-1.471,43.092],[-1.415,43.127],[-1.383,43.253],[-1.505,43.293],[-1.609,43.252],[-1.623,43.301],[-1.73,43.296],[-1.789,43.374],[-1.601,43.433],[-1.442,43.664],[-1.316,44.13],[-1.259,44.547],[-1.192,44.661],[-1.017,44.649],[-1.166,44.775],[-1.262,44.632],[-1.136,45.511],[-1.061,45.56],[-1.039,45.512],[-0.838,45.378],[-0.768,45.29],[-0.683,45.079],[-0.609,45.015],[-0.591,45.042],[-0.668,45.127],[-0.734,45.369],[-0.802,45.46],[-1.01,45.611],[-1.237,45.706],[-1.243,45.782],[-1.132,45.805],[-1.153,45.862],[-1.101,45.872],[-1.064,45.95],[-1.099,45.991],[-1.053,46.011],[-1.129,46.127],[-1.224,46.166],[-1.199,46.213],[-1.111,46.261],[-1.129,46.31],[-1.202,46.316],[-1.207,46.267],[-1.344,46.342],[-1.466,46.342],[-1.502,46.397],[-1.814,46.495],[-1.856,46.609],[-2.141,46.818],[-2.155,46.89],[-1.98,47.029],[-2.053,47.094],[-2.227,47.131],[-2.167,47.166],[-2.17,47.268],[-2.302,47.236],[-2.37,47.277],[-2.442,47.261],[-2.514,47.285],[-2.503,47.329],[-2.559,47.375],[-2.451,47.425],[-2.499,47.457],[-2.502,47.49],[-2.441,47.496],[-2.466,47.512],[-2.652,47.539],[-2.681,47.496],[-2.849,47.499],[-2.909,47.56],[-2.762,47.536],[-2.715,47.577],[-2.755,47.636],[-2.894,47.582],[-3.123,47.57],[-3.133,47.532],[-3.094,47.482],[-3.129,47.474],[-3.14,47.58],[-3.21,47.641],[-3.126,47.723],[-3.176,47.735],[-3.215,47.645],[-3.349,47.729],[-3.453,47.695],[-3.521,47.758],[-3.523,47.849],[-3.539,47.763],[-3.736,47.806],[-3.851,47.796],[-3.979,47.905],[-3.978,47.854],[-4.164,47.849],[-4.175,47.876],[-4.197,47.861],[-4.159,47.832],[-4.183,47.801],[-4.362,47.796],[-4.379,47.822],[-4.35,47.857],[-4.423,47.963],[-4.541,48.013],[-4.699,48.028],[-4.716,48.062],[-4.286,48.105],[-4.273,48.154],[-4.303,48.195],[-4.463,48.238],[-4.554,48.168],[-4.545,48.241],[-4.606,48.261],[-4.553,48.339],[-4.535,48.284],[-4.223,48.296],[-4.367,48.344],[-4.442,48.327],[-4.403,48.39],[-4.425,48.398],[-4.609,48.338],[-4.678,48.355],[-4.772,48.329],[-4.761,48.373],[-4.795,48.413],[-4.762,48.531],[-4.52,48.635],[-4.432,48.635],[-4.35,48.677],[-4.224,48.648],[-4.187,48.686],[-4.058,48.689],[-3.983,48.726],[-3.949,48.653],[-3.904,48.664],[-3.846,48.627],[-3.854,48.686],[-3.821,48.701],[-3.659,48.695],[-3.659,48.659],[-3.581,48.67],[-3.585,48.717],[-3.55,48.748],[-3.584,48.771],[-3.541,48.823],[-3.398,48.801],[-3.22,48.866],[-3.203,48.835],[-3.094,48.868],[-3.083,48.827],[-3.014,48.822],[-3.006,48.8],[-3.045,48.788],[-2.929,48.754],[-2.945,48.721],[-2.827,48.651],[-2.82,48.594],[-2.72,48.555],[-2.698,48.506],[-2.495,48.609],[-2.468,48.65],[-2.315,48.674],[-2.294,48.66],[-2.337,48.62],[-2.264,48.644],[-2.205,48.579],[-2.124,48.604],[-2.141,48.632],[-2.111,48.639],[-2.03,48.623],[-1.972,48.535],[-1.948,48.539],[-2.026,48.652],[-1.938,48.694],[-1.849,48.695],[-1.872,48.647],[-1.774,48.603],[-1.444,48.628],[-1.393,48.651],[-1.56,48.735],[-1.574,48.822],[-1.605,48.838],[-1.543,48.931],[-1.609,49.079],[-1.589,49.233],[-1.632,49.214],[-1.711,49.325],[-1.807,49.372],[-1.886,49.54],[-1.841,49.572],[-1.845,49.619],[-1.86,49.65],[-1.946,49.674],[-1.942,49.726],[-1.625,49.646],[-1.421,49.704],[-1.268,49.695],[-1.229,49.609],[-1.296,49.583],[-1.306,49.539],[-1.168,49.408],[-1.179,49.378],[-1.12,49.356],[-1.078,49.388],[-0.939,49.395],[-0.825,49.358],[-0.415,49.336],[-0.226,49.282],[-0.001,49.326],[0.13,49.403],[0.339,49.441],[0.121,49.463],[0.07,49.506],[0.192,49.706],[0.573,49.85],[1.02,49.916],[1.206,49.973],[1.454,50.11],[1.483,50.172],[1.548,50.215],[1.684,50.183],[1.538,50.283],[1.551,50.35],[1.642,50.352],[1.556,50.398],[1.585,50.537],[1.619,50.535],[1.577,50.572],[1.561,50.7],[1.604,50.763],[1.584,50.872],[1.781,50.955],[2.546,51.088],[2.574,51.004],[2.633,50.946],[2.59,50.919],[2.635,50.813],[2.718,50.813],[2.813,50.717],[2.898,50.694],[3.022,50.772],[3.152,50.782],[3.258,50.701],[3.241,50.658],[3.287,50.528],[3.376,50.491],[3.474,50.534],[3.519,50.523],[3.496,50.499],[3.607,50.497],[3.664,50.453],[3.658,50.371],[3.71,50.303],[3.747,50.351],[3.909,50.328],[4.027,50.357],[4.124,50.274],[4.208,50.273],[4.222,50.257],[4.127,50.135],[4.197,50.135],[4.228,50.08],[4.136,50.02],[4.141,49.979],[4.196,49.956],[4.51,49.947],[4.675,49.997],[4.683,50.069],[4.762,50.136],[4.88,50.152],[4.895,50.135],[4.79,49.97],[4.889,49.91],[4.852,49.861],[4.855,49.792],[4.999,49.799],[5.09,49.765],[5.166,49.693],[5.267,49.697],[5.332,49.655],[5.312,49.614],[5.431,49.593],[5.471,49.497],[5.774,49.563],[5.869,49.499],[5.972,49.491],[5.983,49.451],[6.256,49.51],[6.554,49.418],[6.541,49.401],[6.587,49.385],[6.568,49.345],[6.72,49.221],[6.739,49.164],[6.835,49.151],[6.861,49.179],[6.835,49.211],[6.935,49.222],[7.034,49.19],[7.054,49.113],[7.103,49.14],[7.283,49.117],[7.445,49.184],[7.494,49.17],[7.529,49.097],[7.635,49.054],[7.795,49.066],[7.869,49.034],[7.935,49.058],[8.091,48.989],[8.223,48.976],[8.096,48.81],[7.97,48.755],[7.963,48.721],[7.84,48.641],[7.736,48.404],[7.745,48.336],[7.577,48.12],[7.572,48.03],[7.622,47.972],[7.557,47.88],[7.548,47.74],[7.514,47.703],[7.585,47.577],[7.506,47.544],[7.525,47.52],[7.487,47.482],[7.435,47.498],[7.45,47.475],[7.381,47.432],[7.246,47.422],[7.171,47.444],[7.187,47.491],[7.13,47.503]],[[9.402,41.859],[9.387,41.66],[9.288,41.609],[9.296,41.583],[9.365,41.596],[9.224,41.442],[9.25,41.408],[9.218,41.368],[9.092,41.399],[9.097,41.444],[9.04,41.469],[8.885,41.505],[8.776,41.592],[8.794,41.63],[8.915,41.69],[8.686,41.748],[8.73,41.777],[8.709,41.799],[8.784,41.83],[8.779,41.884],[8.802,41.89],[8.78,41.925],[8.613,41.901],[8.598,41.953],[8.666,41.979],[8.656,42.009],[8.739,42.063],[8.577,42.157],[8.561,42.237],[8.69,42.278],[8.625,42.312],[8.615,42.35],[8.552,42.347],[8.608,42.417],[8.655,42.416],[8.665,42.514],[8.756,42.571],[8.787,42.558],[8.809,42.599],[9.01,42.64],[9.125,42.732],[9.221,42.736],[9.293,42.674],[9.323,42.698],[9.34,42.801],[9.312,42.83],[9.359,43.007],[9.464,42.986],[9.491,42.795],[9.446,42.674],[9.527,42.566],[9.56,42.281],[9.55,42.104],[9.414,41.956],[9.402,41.859]]];
  let ttData = null;   // { url, coordinates, max } : image courante (recréée à chaque changement de style)
  const ttColor = t => {
    let i = 1; while (i < TT_RAMP.length - 1 && t > TT_RAMP[i][0]) i++;
    const [a, ca] = TT_RAMP[i - 1], [b, cb] = TT_RAMP[i], k = Math.max(0, Math.min(1, (t - a) / (b - a)));
    return ca.map((v, j) => v + (cb[j] - v) * k);
  };
  const ttOpacity = () => NIGHT ? .42 : .5;
  /* Sous le premier nom du fond de carte (nos couches viennent toutes après), sinon sous nos couches */
  const ttBefore = () => map.getStyle().layers.find(l => l.type === "symbol")?.id || (map.getLayer("lgv-casing") ? "lgv-casing" : undefined);
  function ttLayer(before) {
    if (!ttData || map.getSource("tt")) return;
    map.addSource("tt", { type: "image", url: ttData.url, coordinates: ttData.coordinates });
    map.addLayer({ id: "tt", type: "raster", source: "tt", paint: { "raster-opacity": 0, "raster-resampling": "linear", "raster-fade-duration": 0 } }, before);
    requestAnimationFrame(() => map.getLayer("tt") && map.setPaintProperty("tt", "raster-opacity", ttOpacity()));
  }
  /* La légende du temps de parcours se place au-dessus de celle des vitesses quand celle-ci est affichée */
  /* Sur mobile, la légende des trajets occupe le bas de la carte sur toute la largeur : on se place juste au-dessus */
  const NARROW = matchMedia("(max-width: 760px)");
  function ttPlace() {
    const sp = $("speed"), lg = $("legend");
    $("ttlegend").style.bottom = NARROW.matches ? `${lg.offsetHeight + 16}px` : sp.style.display === "block" ? `${sp.offsetHeight + 44}px` : "";
  }
  addEventListener("resize", () => ttData && ttPlace());
  function setTravelTime(pts) {
    if (map.getLayer("tt")) map.removeLayer("tt");
    if (map.getSource("tt")) map.removeSource("tt");
    ttData = null; $("ttlegend").classList.remove("show");
    if (pts.length < 3) return;
    const M = pts.map(p => ({ ...p, m: maplibregl.MercatorCoordinate.fromLngLat(p.xy) }));
    const lat0 = M.reduce((s, p) => s + p.xy[1], 0) / M.length, km = 40075 * Math.cos(lat0 * Math.PI / 180);   // km par unité Mercator
    const pad = TT_FAR / km;
    let x0 = Math.min(...M.map(p => p.m.x)) - pad, x1 = Math.max(...M.map(p => p.m.x)) + pad;
    let y0 = Math.min(...M.map(p => p.m.y)) - pad, y1 = Math.max(...M.map(p => p.m.y)) + pad;
    const S = 260, W = Math.max(2, Math.round(S * Math.min(1, (x1 - x0) / (y1 - y0)))), H = Math.max(2, Math.round(S * Math.min(1, (y1 - y0) / (x1 - x0))));
    /* Échelle : pas de graduation de 1, 2, 3, 4, 6, 8 ou 12 h, choisi pour avoir au plus 4 intervalles ; la durée max est arrondie au pas */
    const tmax = Math.max(60, Math.max(...M.map(p => p.t)));
    const step = [60, 120, 180, 240, 360, 480, 720].find(st => Math.ceil(tmax / st) <= 4) || 720, max = Math.ceil(tmax / step) * step;
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d"), img = ctx.createImageData(W, H), d = img.data;
    const near2 = (TT_NEAR / km) ** 2;
    for (let j = 0; j < H; j++) {
      const y = y0 + (y1 - y0) * (j + .5) / H;
      for (let i = 0; i < W; i++) {
        const x = x0 + (x1 - x0) * (i + .5) / W;
        let num = 0, den = 0, dmin = Infinity;
        for (const p of M) {
          const d2 = (p.m.x - x) ** 2 + (p.m.y - y) ** 2;
          if (d2 < dmin) dmin = d2;
          const w = 1 / (d2 + near2 * .02) ** 1.5;   // petit lissage : pas de pic exact sur chaque gare
          num += w * p.t; den += w;
        }
        const dk = Math.sqrt(dmin) * km, a = dk <= TT_NEAR ? 1 : dk >= TT_FAR ? 0 : 1 - (dk - TT_NEAR) / (TT_FAR - TT_NEAR);
        const [r, g, b] = ttColor(num / den / max), o = (j * W + i) * 4;
        d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = Math.round(255 * a * a * (3 - 2 * a));   // bord adouci
      }
    }
    ctx.putImageData(img, 0, 0);
    /* Découpe sur le contour de la France : on ne garde que ce qui est à l'intérieur */
    ctx.globalCompositeOperation = "destination-in"; ctx.beginPath();
    for (const ring of FRANCE) ring.forEach((p, k) => {
      const m = maplibregl.MercatorCoordinate.fromLngLat(p), px = (m.x - x0) / (x1 - x0) * W, py = (m.y - y0) / (y1 - y0) * H;
      k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    });
    ctx.fill(); ctx.globalCompositeOperation = "source-over";
    const ll = (x, y) => { const c = new maplibregl.MercatorCoordinate(x, y).toLngLat(); return [c.lng, c.lat]; };
    ttData = { url: cv.toDataURL(), coordinates: [ll(x0, y0), ll(x1, y0), ll(x1, y1), ll(x0, y1)], max };
    ttLayer(ttBefore());
    /* Légende : une graduation par pas (au plus 5, la dernière tombe pile sur la durée max) */
    const ticks = []; for (let m = 0; m <= max; m += step) ticks.push(m);
    $("ttlegend").querySelector(".bar").style.background = `linear-gradient(90deg, ${TT_RAMP.map(([t, c]) => `rgb(${c}) ${t * 100}%`).join(", ")})`;
    $("tt-sc").innerHTML = ticks.map(m => `<span style="--x:${m / max}">${m ? `${m / 60} h` : "0"}</span>`).join("");
    $("ttlegend").classList.add("show"); ttPlace();
  }

  /* Apparition des trajets : chaque ligne se dessine de la gare de départ vers la gare d'arrivée (coordonnées déjà dans ce sens),
     à la même vitesse partout (le trajet le plus long en ~1,6 s). Les gares (points) sont affichées d'emblée.
     Pendant l'animation, la source « routes » ne reçoit que les gares (points, étiquettes) ; les lignes se dessinent dans « grow ». */
  let growId = 0, growing = false;
  function growRoutes(fc) {
    const id = ++growId, src = () => map.getSource("routes"), gsrc = () => map.getSource("grow");
    gsrc()?.setData(EMPTY_FC); growing = false;
    const lf = fc.features.filter(f => f.geometry.type === "LineString");
    if (REDUCE || !lf.length || !gsrc()) { src()?.setData(dedupLines(fc)); return; }
    growing = true;
    src()?.setData({ type: "FeatureCollection", features: fc.features.filter(f => f.geometry.type !== "LineString") });
    /* Correspondances : les trains d'un même trajet (même nom et variante, un trait par train) se suivent ; chaque train part
       de la distance déjà parcourue par les précédents (legOff, en km, mesurée sur les traits complets). */
    const legOff = new Map(), gk = p => `${p.name}\u0000${p.vk}`, groups = new Map();
    for (const f of lf) { const k = gk(f.properties); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(f); }
    for (const [k, g] of groups) {
      g.sort((a, b) => (a.properties.leg || 0) - (b.properties.leg || 0)); let acc = 0;
      for (const f of g) { legOff.set(`${k}\u0000${f.properties.leg || 0}`, acc); const c = cumul(f.geometry.coordinates); acc += c[c.length - 1]; }
    }
    /* On anime les tracés dédoublonnés (ceux affichés à la fin) : un tronçon commun à plusieurs trajets n'est dessiné qu'une fois.
       Animer chaque trajet complet, simplifié à sa façon, empilait des tracés légèrement décalés sur les tronçons communs.
       Un front unique avance depuis la gare de départ à la même vitesse sur tous les trajets : chaque morceau commence
       quand le front atteint son début (s0, en km), donc les branches repartent bien du tronc commun déjà tracé. */
    const parts = dedupLines(fc).features.filter(f => f.geometry.type === "LineString" && f.properties.part !== "sel")
      .map(f => ({ f, c: f.geometry.coordinates, cum: cumul(f.geometry.coordinates) }));
    /* Tracés allégés (un point au plus tous les STEP km, ~6000 points en tout) pour que le recalcul de chaque image reste rapide */
    const STEP = Math.max(.5, parts.reduce((s, l) => s + l.cum[l.cum.length - 1], 0) / 6000);
    const lines = parts.map(({ f, c, cum }) => {
      const keep = [0]; for (let i = 1; i < c.length - 1; i++) if (cum[i] - cum[keep[keep.length - 1]] >= STEP) keep.push(i);
      if (c.length > 1) keep.push(c.length - 1);
      const coords = keep.map(i => c[i]), cc = cumul(coords), len = cc[cc.length - 1];
      const s0 = (legOff.get(`${gk(f.properties)}\u0000${f.properties.leg || 0}`) || 0) + (f.properties.off || 0);
      return { f, coords, cum: cc, s0, s1: s0 + len };
    });
    const D = Math.max(...lines.map(l => l.s1)) || 1;
    const cut = (coords, cum, p) => {
      const d = cum[cum.length - 1] * p; let i = 1;
      while (i < cum.length && cum[i] < d) i++;
      if (i >= cum.length) return coords;
      const [x1, y1] = coords[i - 1], [x2, y2] = coords[i], t = (d - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1);
      return [...coords.slice(0, i), [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]];
    };
    const t0 = performance.now(), DUR = 1600;
    const frame = now => {
      if (id !== growId) return;   // nouveau rendu entre-temps (il a déjà vidé « grow »)
      if (routesData !== fc) { growing = false; gsrc()?.setData(EMPTY_FC); return; }   // réinitialisation entre-temps
      const g = gsrc(); if (!g) { growing = false; return; }   // style rechargé entre-temps : addOverlays a déjà remis les tracés complets
      const k = Math.min(1, (now - t0) / DUR), p = (1 - Math.cos(Math.PI * k)) / 2;   // progression régulière, juste adoucie au départ et à l'arrivée
      if (k >= 1) {
        /* Fin : tracés complets dans « routes » ; les lignes animées ne sont retirées qu'une fois ceux-ci affichés (pas de clignotement) */
        growing = false; const s = src(); s?.setData(dedupLines(fc));
        const swap = () => { if (id !== growId) return; if (s?.loaded && !s.loaded()) return requestAnimationFrame(swap); gsrc()?.setData(EMPTY_FC); };
        return requestAnimationFrame(swap);
      }
      /* Une seule mise à jour en cours à la fois : tant que le worker n'a pas fini la précédente, on saute l'image */
      const d = p * D;   // distance atteinte par le front (km)
      if (!g.loaded || g.loaded()) g.setData({ type: "FeatureCollection", features: lines.filter(l => d >= l.s0).map(l =>
        ({ type: "Feature", properties: l.f.properties, geometry: { type: "LineString", coordinates: cut(l.coords, l.cum, Math.max(Math.min(1, (d - l.s0) / ((l.s1 - l.s0) || 1)), .001)) } })) });
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /* Trajets Intercités (jour ou nuit) : le plus court chemin sans LGV ne suit pas toujours la desserte réelle
     (ex. Paris → Toulouse tracé par Bordeaux au lieu de Limoges). Une fois la carte affichée, on récupère en une requête
     les arrêts d'un train représentatif de chaque variante, et on retrace en passant par ces arrêts (comme la fiche détaillée). */
  async function refineClassic(fc, rts) {
    const todo = rts.flatMap(r => r.vars.filter(v => v.rep && v.steps.some(s => s[2])).map(v => ({ r, v, legs: v.rep.legs || [v.rep] })));
    if (!todo.length || !qDate) return;
    try { await fetchTrains(qDate, [...new Set(todo.flatMap(x => x.legs.map(l => String(l.no))))]); } catch { return; }
    let changed = false;
    for (const { r, v, legs } of todo) {
      if (routesData !== fc) return;   // nouveau rendu entre-temps
      const per = await trainStops(legs); if (!per || routesData !== fc) return;
      if (pathOf === r.name) continue;   // tracé détaillé déjà calculé pour ce trajet
      const parts = legs.map((l, i) => gRouteVia(l.from, per[i] || [], l.to, isIC(l)));
      if (!parts.every(p => p?.length)) continue;
      const coords = pathGeo(parts.flat()).coords;
      const mine = f => f.geometry.type === "LineString" && f.properties.name === r.name && f.properties.vk === v.key;
      const old = fc.features.filter(mine); if (!old.length) continue;
      const { leg, ...props } = old[0].properties;
      const nf = lineFeats({ ...props, kind: props.ok ? bestKind(legs) : "" }, parts, legs.map(l => l.kind));
      fc.features.splice(fc.features.indexOf(old[0]), 0, ...nf);   // à la place des anciens traits (même ordre de dessin)
      for (const f of old) fc.features.splice(fc.features.indexOf(f), 1);
      v.coords = coords; v.cum = cumul(coords); delete v.bounds;
      changed = true;
    }
    /* Pendant l'animation d'apparition, son image finale reprendra ces tracés corrigés (fc modifié en place) */
    if (changed && !growing && routesData === fc) map.getSource("routes")?.setData(dedupLines(fc));
  }

  async function render() {
    const wanted = $("dest").value, full = $("full").checked, ks = kindSet();
    await garesReady.catch(() => { });
    /* Destination précise choisie : les trains arrivant à une gare voisine (ex. Paris Nord pour Paris Gare de Lyon) y sont rattachés,
       avec le changement de gare à l'arrivée (et au départ du retour) */
    FAR = xferOn && !rev && wanted ? nearOf(wanted.split("|"), new Set([...HUB_NAMES, ...NEAR_HUB.keys()])) : new Map();
    const g = curG = withConn(group(), false, ks), gb = curGB = rDate ? withConn(group(back, true), true, ks) : null;
    const vias = [...g.values()].flat().flatMap(t => t.via || []);
    await garesReady;
    await Promise.all([geocodeMissing([hub(), ...g.keys(), ...vias]), tracesReady]);
    selected = null; routes = []; popup?.remove();
    const feats = [], items = [], lost = [], tt = [], bounds = new maplibregl.LngLatBounds();
    const o = locate(hub());   // gare fixe : départ (mode normal) ou destination (toutes les gares de départ)
    for (const [name, all0] of g) {
      if (!rev && wanted && !wanted.split("|").includes(name)) continue;
      const trains = ks ? all0.filter(t => kindOk(t, ks)) : all0;
      if (!trains.length) continue;
      trains.sort((a, b) => a.dep.localeCompare(b.dep));
      /* Avec une date de retour, une gare n'est « disponible » que s'il reste des places à l'aller ET au retour */
      const rfree0 = gb ? (gb.get(name) || []).filter(t => t.ok && kindOk(t, ks)).sort((a, b) => a.dep.localeCompare(b.dep)) : null;
      const [free, rfree] = sameDay(trains.filter(t => t.ok), rfree0), ok = free.length > 0 && (!rfree || rfree.length > 0);
      /* Couleur de la gare (point et pastille) : type du train qui la dessert, c.-à-d. pour une correspondance le dernier train
         s'il y arrive, le premier s'il en part (et non le type le plus rapide de l'itinéraire) */
      const side = (l, arriving) => l && l.map(t => ({ kind: t.legs ? (arriving ? t.legs[t.legs.length - 1] : t.legs[0]).kind : t.kind }));
      const sFree = side(free, !rev), sRfree = side(rfree, rev), kind = ok ? bestKind(sFree) : "";
      if (!ok && !full) continue;
      items.push({ name, trains, ok, free, rfree });
      const c = locate(name);
      if (!c || !o) { lost.push(name); continue; }
      /* Tracé ferroviaire réel (pas de ligne droite) : si aucun tracé n'est trouvé, seule la gare est affichée.
         Destination desservie uniquement par des Intercités : tracé sur lignes classiques.
         Itinéraire avec correspondance : tracé gare par gare (pointillés, gares de correspondance marquées).
         Une ligne par variante (direct, via X, via Y…) : toutes sont tracées, la fiche détaillée permet d'en choisir une. */
      const byVar = new Map();
      for (const t of ok ? free : trains) { const k = vkey(t); if (!byVar.has(k)) byVar.set(k, []); byVar.get(k).push(t); }
      const vars = [...byVar].sort(([a], [b]) => vsort(a, b)).map(([key, l]) => {
        const steps = stepsOf(name, l), parts = stepsParts(steps), coords = parts ? pathGeo(parts.flat()).coords : null;
        if (coords) feats.push(...lineFeats({ name, ok, kind: ok ? bestKind(l) : "", conn: steps.length > 1, vk: key }, parts, steps.map(s => s[3])));
        for (const [v] of steps.slice(1)) { const vc = locate(v); if (vc) { feats.push({ type: "Feature", properties: { name, via: true, vk: key, label: clean(v) }, geometry: { type: "Point", coordinates: vc } }); bounds.extend(vc); } }
        if (coords) for (const xy of coords) bounds.extend(xy);
        return coords ? { key, steps, coords, cum: cumul(coords), rep: l[0] } : { key, steps, rep: l[0] };
      });
      feats.push({ type: "Feature", properties: { name, ok, kind, label: clean(name), pill: pillId(ok, sFree, sRfree) }, geometry: { type: "Point", coordinates: c } });
      const [a, b] = rev ? [c, o] : [o, c];
      routes.push({ name, a, b, ok, vars });
      if (ok) tt.push({ xy: c, t: Math.min(...free.map(durMin)) });
      bounds.extend(c);
    }
    if (o) bounds.extend(o);
    if (o && tt.length) tt.push({ xy: o, t: 0 });
    setTravelTime(tt);
    setOriginMarker(o);
    routesData = { type: "FeatureCollection", features: feats };
    growRoutes(routesData);
    $("legend").classList.toggle("show", feats.length > 0);
    refineClassic(routesData, routes);
    if (feats.length) map.fitBounds(bounds, { padding: fitPad(60), maxZoom: 8 });
    items.sort((a, b) => b.ok - a.ok || a.name.localeCompare(b.name));
    /* Itinéraire avec correspondance : heure de départ suivie de la (des) gare(s) de changement */
    /* Heure de départ, avec la gare réelle si l'on change de gare avant (« depuis X ») ou après (« arrivée X ») */
    const xtag = t => t.xs ? ` depuis ${clean(t.xs.b)}` : t.xe ? ` arrivée ${clean(t.xe.a)}` : "";
    const deps = l => l.length ? `${l.length} train(s) : ${l.map(t => t.legs ? `${t.dep}${xtag(t)} (via ${t.via.map(clean).join(", ")})` : `${t.dep}${xtag(t)}`).join(", ")}` : "complet";
    /* Types de trains disponibles (ordre fixe), et pastille aux couleurs de chacun : une part par type */
    const kindsOf = i => Object.keys(KIND).filter(k => [...i.free, ...(i.rfree || [])].some(t => hasKind(t, k)));
    const dotBg = ks => ks.length < 2 ? KIND[ks[0]]?.[1] || "var(--ko)"
      : `conic-gradient(${ks.map((k, j) => `${KIND[k][1]} ${j * 360 / ks.length}deg ${(j + 1) * 360 / ks.length}deg`).join(", ")})`;
    $("list").innerHTML = items.map(i => { const ks = kindsOf(i); return `<li data-n="${i.name}"><b><span class="dot" style="background:${i.ok ? dotBg(ks) : "var(--ko)"}"></span>${i.name}</b>
  ${!i.rfree ? `<span class="t">${i.ok ? deps(i.free) : "Complet"}</span>`
        : `<span class="t">Aller : ${deps(i.free)}</span><br><span class="t">Retour : ${deps(i.rfree)}</span><br>`}
  ${ks.map(k => `<span class="badge" style="background:${KIND[k][1]}">${KIND[k][0]}</span>`).join("")}</li>`; }).join("");
    $("list").querySelectorAll("li").forEach(li => li.onclick = () => {
      if (selected === li.dataset.n && $("list").querySelector(".detail")) { closeDetail(); return; }
      show(li.dataset.n); focusRoute(li.dataset.n);
    });
    applyHighlight();
    const nOk = items.filter(i => i.ok).length;
    $("status").textContent = (rev ? `${nOk} gare(s) de départ avec des places MAX JEUNE vers ${clean(dest0)}` : `${nOk} destination(s) avec des places MAX JEUNE`)
      + (rDate ? ` à l'aller (${frDate(qDate)}) et au retour (${frDate(rDate)}).` : ".") + (lost.length ? ` Non localisées sur la carte : ${lost.join(", ")}.` : "");
    updHint();
  }

  /* legs / per : trains réellement empruntés et leurs arrêts intermédiaires (voir trainStops) ; le tracé passe alors par chaque arrêt */
  /* Train du retour choisi (x) : son tracé réel (par ses arrêts dès qu'ils sont connus), ses changements de gare et le petit train
     remplacent ceux de l'aller ; per = arrêts intermédiaires de chaque train (null = pas encore chargés) */
  function setBackPath(name, x, per = null) {
    const legs = x.legs || [x], r = routes.find(r => r.name === name);
    pathData = { type: "FeatureCollection", features: [] }; pathOf = null; backVar = null;
    if (G.ready) {
      const parts = legs.map((l, i) => per ? gRouteVia(l.from, per[i] || [], l.to, isIC(l)) : gRoute(l.from, l.to, isIC(l)));
      if (parts.every(p => p?.length)) {
        const g = pathGeo(parts.flat()), cum = cumul(g.coords); let n = 0;
        pathData.features = g.feats; pathOf = name;
        backVar = { key: "retour", steps: legs.map(l => [l.from, l.to, isIC(l), l.kind]), coords: g.coords, cum, bounds: parts.map(p => cum[(n += pathGeo(p).coords.length) - 1]) };
      }
    }
    map.getSource("path")?.setData(pathData);
    showXfers([...(x.xs ? [[x.xs.a, x.xs.b]] : []), ...legs.slice(1).map((l, i) => [legs[i].to, l.from]).filter(([a, b]) => a !== b), ...(x.xe ? [[x.xe.a, x.xe.b]] : [])]);
    applyHighlight();
    anims = r && backVar && !REDUCE ? [{ r, v: backVar, kinds: legs.map(l => l.kind), start: performance.now(), dur: 1800 + Math.min(backVar.cum[backVar.cum.length - 1], 900) * 3 }] : [];
  }
  function setPath(name, legs = null, per = null) {
    const r = routes.find(r => r.name === name);
    pathData = { type: "FeatureCollection", features: [] }; pathOf = null; backVar = null;
    const v = curVar(r);
    if (v && G.ready) {
      /* Tracé étape par étape, pour connaître la distance où se fait chaque correspondance (v.bounds, en km) */
      let parts = per && legs ? legs.map((l, i) => gRouteVia(l.from, per[i] || [], l.to, isIC(l))) : null;
      if (!parts?.every(p => p?.length)) parts = v.steps.map(([A, B, c]) => gRoute(A, B, c));
      if (parts.every(p => p?.length)) {
        const g = pathGeo(parts.flat()); pathData.features = g.feats; v.coords = g.coords; v.cum = cumul(g.coords); pathOf = name;
        let n = 0; v.bounds = parts.map(p => v.cum[(n += pathGeo(p).coords.length) - 1]);
      }
    }
    map.getSource("path")?.setData(pathData);
    /* Changements de gare de l'itinéraire affiché (trains réellement choisis, sinon étapes de la variante) : trajet en métro / RER sur la carte */
    const L = legs || (v ? v.steps.map(([from, to]) => ({ from, to })) : []), x = v?.rep;
    showXfers([...(x?.xs ? [[x.xs.a, x.xs.b]] : []), ...L.slice(1).map((l, i) => [L[i].to, l.from]).filter(([a, b]) => a !== b), ...(x?.xe ? [[x.xe.a, x.xe.b]] : [])]);
  }
  /* ---------- Arrêts intermédiaires ----------
     Le jeu de données contient une ligne par couple de gares desservies par un même train : toutes les lignes d'un numéro de train
     donnent donc ses arrêts (heure de départ ou d'arrivée à chaque gare). Requête à la demande, gardée en mémoire par date et train. */
  let stopsData = EMPTY_FC, stopsReq = 0, pathReq = 0;
  const STOPC = new Map();
  function fetchTrains(date, nos) {
    const key = n => `${date}|${n}`, miss = nos.filter(n => !STOPC.has(key(n)));
    if (miss.length) {
      const p = fetchAll({
        where: `${F.date}=date'${date}' AND ${F.train} IN (${miss.map(n => `"${esc(String(n))}"`).join(",")})`,
        select: [F.origin, F.originIata, F.dest, F.destIata, F.dep, F.arr, F.train].join(",")
      });
      for (const n of miss) STOPC.set(key(n), p.then(rows => rows.filter(r => String(r[F.train]) === String(n))).catch(() => { STOPC.delete(key(n)); return []; }));
    }
    return Promise.all(nos.map(n => STOPC.get(key(n)))).then(a => a.flat());
  }
  /* legs : trains effectivement empruntés (un par tronçon d'itinéraire). Arrêts = gares desservies strictement entre la montée et la descente. */
  /* Par train : gares desservies entre la montée et la descente, dans l'ordre de passage (null si indisponible) */
  async function trainStops(legs, date = qDate) {
    if (!legs?.length || !date) return null;
    const nos = [...new Set(legs.map(l => String(l.no)))];
    let rows; try { rows = await fetchTrains(date, nos); } catch { return null; }
    return legs.map(l => {
      const d0 = mins(l.dep), D = durMin(l), at = new Map();
      for (const r of rows) {
        if (String(r[F.train]) !== String(l.no)) continue;
        for (const [n, h] of [[r[F.origin], r[F.dep]], [r[F.dest], r[F.arr]]]) {
          if (!n || !h || n === l.from || n === l.to) continue;
          const rel = (mins(h) - d0 + 1440) % 1440;
          if (rel > 0 && rel < D && !(at.get(n) <= rel)) at.set(n, rel);
        }
      }
      return [...at].sort((a, b) => a[1] - b[1]).map(([n]) => n);
    });
  }
  async function setStops(legs, date = qDate) {
    const id = ++stopsReq;
    stopsData = EMPTY_FC; map.getSource("stops")?.setData(stopsData);
    const per = await trainStops(legs, date);
    if (!per || id !== stopsReq) return null;
    const names = new Set(per.flat());
    await geocodeMissing([...names]);
    if (id !== stopsReq) return null;   // un autre trajet a été choisi entre-temps
    const feats = [...names].map(n => [n, locate(n)]).filter(([, c]) => c)
      .map(([n, c]) => ({ type: "Feature", properties: { label: clean(n) }, geometry: { type: "Point", coordinates: c } }));
    stopsData = { type: "FeatureCollection", features: feats }; map.getSource("stops")?.setData(stopsData);
    return per;
  }
  function show(name, fromMap = false, keepVar = false) {
    const t0 = curG.get(name); if (!t0) return;
    /* Fiche déjà ouverte, simplement mise à jour (choix d'un train, d'une variante…) : rien ne doit bouger à l'écran */
    const refresh = keepVar && selected === name && !fromMap;
    const keepTop = $("list").scrollTop, keepY = scrollY;
    if (!keepVar || selected !== name) { selVar = selBackVar = selTrain = trainVar = selBack = null; detTab = "out"; }
    /* Uniquement les trains avec des places MAX JEUNE, classés par heure de départ */
    const freeSorted = l => l.filter(x => x.ok).sort((a, b) => a.dep.localeCompare(b.dep) || a.arr.localeCompare(b.arr));
    const [tAll, tb] = sameDay(freeSorted(t0), rDate ? freeSorted(curGB?.get(name) || []) : null);
    /* Plusieurs variantes d'itinéraire : boutons pour n'en garder qu'une (liste des trains et carte) */
    const vkeys = [...new Set(tAll.map(vkey))].sort(vsort);
    if (selVar != null && !vkeys.includes(selVar)) selVar = null;
    const t = selVar == null ? tAll : tAll.filter(x => vkey(x) === selVar);
    /* Variantes du retour (via X, depuis Y…) : mêmes boutons, dans l'onglet Retour */
    const bkeys = tb ? [...new Set(tb.map(vkey))].sort(vsort) : [];
    if (selBackVar != null && !bkeys.includes(selBackVar)) selBackVar = null;
    const tbv = tb && (selBackVar == null ? tb : tb.filter(x => vkey(x) === selBackVar));
    /* Train choisi (ou le seul de la liste) : ses arrêts sont affichés */
    /* Train du retour choisi : c'est lui qui est tracé (l'aller n'est alors pas choisi) */
    let chosenB = (selBack && tbv?.find(x => tkey(x) === selBack)) || null;
    if (!chosenB && detTab === "back" && selBackVar != null && tbv.length === 1) chosenB = tbv[0];   // une seule possibilité dans la variante : elle est tracée
    if (!chosenB) selBack = null;
    let chosen = chosenB ? null : t.find(x => tkey(x) === selTrain) || null;
    if (!chosen) { selTrain = trainVar = null; if (t.length === 1 && !chosenB) chosen = t[0]; }
    if (chosenB) detTab = "back";   // train du retour choisi : on reste sur l'onglet Retour
    const chipsOf = (keys, list, sel, back) => keys.length < 2 ? "" : `<div class="vchips" role="group" aria-label="Itinéraires ${back ? "du retour " : ""}à afficher">${[[null, "Tous", list.length], ...keys.map(k => [k, vlabel(k, keys), list.filter(x => vkey(x) === k).length])]
      .map(([k, l, n]) => `<button type="button" class="vchip${k === sel ? " sel" : ""}" aria-pressed="${k === sel}"${back ? " data-back" : ""}${k == null ? " data-all" : ` data-k="${attr(k)}"`}>${l} <span>${n}</span></button>`).join("")}</div>`;
    const chips = chipsOf(vkeys, tAll, selVar, false), chipsB = tb ? chipsOf(bkeys, tb, selBackVar, true) : "";
    const [A, B] = ends(name);
    popup?.remove(); $("list").querySelector(".detail")?.remove();
    selected = name;
    const req = ++pathReq;
    const pfoot = () => { const f = $("list").querySelector(".detail .pfoot"); if (f && pathOf === name) f.textContent = `Tracé réel : ${pathData.features.length} tronçon(s), jusqu'à ${Math.max(...pathData.features.map(f => f.properties.v))} km/h`; };
    let stopsP;
    if (chosenB) {
      /* Retour : tracé tout de suite, puis recalé sur les arrêts réels du train dès qu'ils sont chargés */
      setBackPath(name, chosenB);
      stopsP = setStops(chosenB.legs || [chosenB], rDate);
      stopsP.then(per => { if (per && req === pathReq && selected === name && selBack === tkey(chosenB)) { setBackPath(name, chosenB, per); pfoot(); } });
    } else {
      setPath(name); applyHighlight(); launch(name, chosen ? (chosen.legs || [chosen]).map(l => l.kind) : null);
      stopsP = setStops(chosen && pathOf === name ? chosen.legs || [chosen] : []);
    }
    /* Le tracé doit passer par les arrêts réels : celui du train choisi, sinon du premier train de la variante tracée */
    const v0 = curVar(routes.find(r => r.name === name)), ref = chosenB ? null : chosen || (v0 && t.find(x => vkey(x) === v0.key));
    if (ref && pathOf === name) {
      const legs = ref.legs || [ref];
      (chosen ? stopsP : trainStops(legs)).then(per => {
        if (!per || req !== pathReq || selected !== name) return;
        setPath(name, legs, per); pfoot();
      });
    }
    /* Train de nuit choisi : le mode nuit s'active ; il se désactive si c'était automatique et que le train choisi n'est plus de nuit */
    const picked = chosen || chosenB, isNight = !!picked && (picked.legs || [picked]).some(l => l.kind === "ICN");
    if (isNight) setNight(true, true); else if (nightAuto) setNight(false, true);
    const ids = new Map([...t, ...(tb || [])].flatMap(x => x.legs || [x]).flatMap(x => [x.from, x.to]).map(n => [n, tlId(n)]));
    const hm = d => `${Math.floor(d / 60)}h${String(d % 60).padStart(2, "0")}`;
    const dur = x => hm(durMin(x));
    /* Heure d'arrivée ; arrivée le lendemain (train de nuit) : « +1 », avec la date d'arrivée en infobulle */
    const arrTxt = (x, date) => {
      if (!night(x)) return `<b>${x.arr}</b>`;
      const n = new Date(date + "T12:00"); n.setDate(n.getDate() + 1);
      const d = n.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
      return `<b title="Arrivée le lendemain, ${d}">${x.arr}<sup class="jplus" aria-label="le lendemain">+1</sup></b>`;
    };
    /* pk : attributs d'un train cliquable (aller, ou retour : data-b), pour afficher son tracé et ses arrêts */
    const isPick = x => x === chosen || x === chosenB;
    const pk = x => ` data-t="${attr(tkey(x))}"${tb?.includes(x) ? " data-b" : ""} tabindex="0" role="button" aria-pressed="${isPick(x)}" title="Afficher ce train et ses arrêts sur la carte"`;
    const trow = (x, date, pick) => {
      const o = ids.get(x.from), d = ids.get(x.to), k = KIND[x.kind];
      return `<div class="trow${pick ? ` pickable${isPick(x) ? " pick" : ""}` : ""}"${pick ? pk(x) : ""}>
  <div class="ttime"><b>${x.dep}</b><span class="tdur">${dur(x)}</span>${arrTxt(x, date)}</div>
  <div class="tst"><span>${clean(x.from)}</span><span>${clean(x.to)}</span></div>
  <div class="tmeta">${k ? `<span class="badge" style="background:${k[1]}">${k[0]}</span>` : ""}<span>Train ${x.no}</span></div>
  <div class="tbtn"><a class="book" href="${sncfLink(x.oIata, x.dIata, date, x.dep)}" target="_blank" rel="noopener">SNCF Connect</a><a class="book alt" href="${trainlineLink(o, d, date, x.dep)}" target="_blank" rel="noopener"${o && d ? "" : ` data-q="${phrase(x.from, x.to, date, x.dep)}"`}>Trainline</a></div></div>`;
    };
    /* Itinéraire avec correspondance(s) : en-tête (horaires et durée totale), puis chaque train à réserver séparément */
    const connRow = (x, date, pick) => {
      const n = x.legs.length - 1;
      return `<div class="tconn${pick ? ` pickable${isPick(x) ? " pick" : ""}` : ""}"${pick ? pk(x) : ""}>
  <div class="tconn-head"><div class="ttime"><b>${x.dep}</b><span class="tdur">${dur(x)}</span>${arrTxt(x, date)}</div>
  <div class="tconn-sub">${n} correspondance${n > 1 ? "s" : ""} · via ${x.via.map(clean).join(", ")}</div></div>
  ${x.legs.map((l, i) => {
        if (!i) return trow(l, date);
        const p = x.legs[i - 1], w = hm(mins(l.dep) - mins(p.arr));
        if (p.to === l.from) return `<div class="twait">Correspondance à ${clean(l.from)} · ${w} d'attente</div>` + trow(l, date);
        return xferInfo(p.to, l.from, "Changement de gare", xferBetween(p.to, l.from), ` · ${w} entre les deux trains`) + trow(l, date);
      }).join("")}</div>`;
    };
    /* Changement de gare a → b : ligne d'en-tête, puis comment s'y rendre (métro, RER…) et lien d'itinéraire */
    const xferInfo = (a, b, head, xm, tail = "") => {
      const how = xferHow(a, b);
      return `<div class="twait">${head} : ${clean(a)} → ${clean(b)}${xm ? ` (prévoir ~${xm} min)` : ""}${tail}</div>
  <div class="txfer">${how ? `${how} ` : ""}<a href="${xferLink(a, b)}" target="_blank" rel="noopener">${how ? "Voir l'itinéraire" : "Itinéraire en transports en commun"}</a></div>`;
    };
    /* Changement de gare avant le premier train (xs) ou après le dernier (xe) */
    const withXfer = (x, row) => (x.xs ? xferInfo(x.xs.a, x.xs.b, "Avant le départ, changement de gare", x.xs.min) : "") + row
      + (x.xe ? xferInfo(x.xe.a, x.xe.b, "À l'arrivée, changement de gare", x.xe.min) : "");
    const rowsOf = (list, date, pick) => list.map(x => withXfer(x, x.legs ? connRow(x, date, pick) : trow(x, date, pick))).join("") || `<div class="tempty">Aucune place MAX JEUNE ce jour-là.</div>`;
    const nTr = n => `<b>${n}</b> train${n > 1 ? "s" : ""}`;
    /* Aller-retour : deux onglets « Aller » / « Retour », un seul sens affiché à la fois (les variantes ne concernent que l'aller) */
    const tab = (k, lbl, from, to, date, n) => `<button type="button" class="dtab" role="tab" id="dtab-${k}" data-tab="${k}" aria-controls="dpan-${k}" aria-selected="${detTab === k}" tabindex="${detTab === k ? 0 : -1}">
  <span class="dtab-l">${lbl}<em>${n}</em></span><span class="dtab-s" title="${clean(from)} → ${clean(to)}">${frDate(date)} · vers ${clean(to)}</span></button>`;
    const rows = !tb ? chips + rowsOf(t, qDate, true)
      : `<div class="dtabs" role="tablist" aria-label="Sens du trajet">${tab("out", "Aller", A, B, qDate, t.length)}${tab("back", "Retour", B, A, rDate, tbv.length)}</div>
  <div class="dpan" id="dpan-out" role="tabpanel" aria-labelledby="dtab-out"${detTab === "out" ? "" : " hidden"}>${chips}${rowsOf(t, qDate, true)}</div>
  <div class="dpan" id="dpan-back" role="tabpanel" aria-labelledby="dtab-back"${detTab === "back" ? "" : " hidden"}>${rDate === qDate ? `<div class="hint psame">Aller-retour dans la journée : seuls les trains compatibles sont affichés (retour après l'arrivée du premier aller).</div>` : ""}${chipsB}${rowsOf(tbv, rDate, true)}</div>`;
    /* Détail affiché dans la liste, juste sous le trajet choisi */
    const li = [...$("list").children].find(l => l.dataset.n === name); if (!li) return;
    const det = document.createElement("li");
    det.className = "detail";
    det.innerHTML = `<div class="det-head"><span>${tb ? `Aller-retour · ${nTr(t.length + tb.length)} MAX JEUNE` : `${frDate(qDate)} · ${nTr(t.length)} MAX JEUNE`}</span>
  <button class="det-x" type="button" title="Fermer" aria-label="Fermer le détail"><svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7"/></svg></button></div>
  ${rows}
  ${pathOf === name ? `<div class="pfoot">Tracé réel : ${pathData.features.length} tronçon(s), jusqu'à ${Math.max(...pathData.features.map(f => f.properties.v))} km/h</div>` : ""}<div class="hint">${t.length > 1 || tb?.length ? "Cliquez sur un train (aller ou retour) pour l'afficher avec ses arrêts sur la carte. " : ""}Les boutons ouvrent la recherche de ce train (choisissez ensuite le tarif MAX JEUNE sur SNCF Connect).${[...t, ...(tb || [])].some(x => x.legs) ? ` Avec correspondance, chaque train se réserve séparément : en cas de retard, la correspondance n'est pas garantie (correspondance minimale de ${MIN_CORR} min${maxWait < Infinity ? `, attente maximale de ${durTxt(maxWait)}` : ""}).` : ""}</div>`;
    det.querySelector(".det-x").onclick = () => { closeDetail(); li.focus?.(); };
    det.querySelectorAll(".vchip").forEach(b => b.onclick = () => ("back" in b.dataset ? pickBackVar : pickVar)(name, "all" in b.dataset ? null : b.dataset.k));
    /* Onglets Aller / Retour : bascule sans recharger la fiche (flèches gauche / droite au clavier) */
    const tabs = [...det.querySelectorAll(".dtab")];
    const setTab = k => {
      detTab = k;
      for (const b of tabs) { const on = b.dataset.tab === k; b.setAttribute("aria-selected", on); b.tabIndex = on ? 0 : -1; det.querySelector(`#dpan-${b.dataset.tab}`).hidden = !on; }
    };
    tabs.forEach(b => {
      b.onclick = () => setTab(b.dataset.tab);
      b.onkeydown = e => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); const o = tabs.find(x => x !== b); setTab(o.dataset.tab); o.focus(); } };
    });
    det.querySelectorAll("[data-t]").forEach(el => {
      const back = "b" in el.dataset, go = () => pickTrain(name, el.dataset.t === (back ? selBack : selTrain) ? null : el.dataset.t, back);
      el.onclick = e => { if (!e.target.closest("a, button")) go(); };
      el.onkeydown = e => { if (e.target === el && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); go(); } };
    });
    /* Arrêts du train choisi, listés en italique sous chacun de ses trains (une ligne par train de l'itinéraire) */
    const pickEl = det.querySelector(".pick");
    if (pickEl) stopsP.then(per => {
      if (!per || !pickEl.isConnected) return;
      const trs = pickEl.matches(".trow") ? [pickEl] : [...pickEl.querySelectorAll(".trow")];
      trs.forEach((tr, i) => tr.querySelector(".tmeta")?.insertAdjacentHTML("afterend",
        `<div class="tstops">${per[i]?.length ? `${per[i].length} arrêt${per[i].length > 1 ? "s" : ""} : ${per[i].map(n => `<i>${clean(n)}</i>`).join(", ")}` : "Sans arrêt"}</div>`));
    });
    li.after(det);
    updHint();
    if (refresh) {
      /* Mise à jour : même position de défilement (liste et page), sans animation d'apparition */
      det.classList.add("still");
      $("list").scrollTop = keepTop; if (scrollY !== keepY) scrollTo({ top: keepY, behavior: "instant" });
      return;
    }
    /* La liste défile pour montrer le trajet en haut, avec son détail dessous.
       Sur téléphone, un clic dans la liste ne fait pas bouger la page ; un clic sur la carte descend jusqu'au trajet. */
    if (fromMap || !MOBILE.matches) li.scrollIntoView({ behavior: REDUCE ? "auto" : "smooth", block: "start" });
  }
  /* Choix d'une variante (bouton de la fiche ou clic sur son tracé) : seule elle reste sur la carte */
  function pickVar(name, key) {
    selVar = key; selTrain = trainVar = selBack = null; detTab = "out"; show(name, false, true); focusRoute(name);
    $("list").querySelector(`.vchip${key == null ? "[data-all]" : `[data-k="${CSS.escape(key)}"]`}`)?.focus({ preventScroll: true });
  }
  /* Variante du retour : filtre la liste de l'onglet Retour (et la trace si elle ne compte qu'un train) */
  function pickBackVar(name, key) {
    selBackVar = key; selBack = null; detTab = "back"; show(name, false, true);
    $("list").querySelector(`.vchip[data-back]${key == null ? "[data-all]" : `[data-k="${CSS.escape(key)}"]`}`)?.focus({ preventScroll: true });
  }
  /* Choix d'un train de l'aller (clic sur sa carte) : sa variante est tracée et ses arrêts apparaissent ; second clic = annule */
  function pickTrain(name, key, back = false) {
    if (back) {
      /* Train du retour : il remplace l'aller sur la carte (second clic = on revient à l'aller) */
      selBack = key && (curGB?.get(name) || []).some(x => tkey(x) === key) ? key : null; selTrain = trainVar = null;
    } else {
      const x = key && (curG.get(name) || []).find(x => tkey(x) === key);
      selTrain = x ? key : null; trainVar = x ? vkey(x) : null; selBack = null; detTab = "out";
    }
    show(name, false, true); focusRoute(name);
    if (key) $("list").querySelector(`[data-t="${CSS.escape(key)}"]${back ? "[data-b]" : ":not([data-b])"}`)?.focus({ preventScroll: true });
  }
  /* ---------- Indications en haut de la carte ----------
     Une phrase selon l'étape : accueil (choisir un départ), résultats (choisir une destination), destination ouverte
     (choisir un itinéraire ou un train), train choisi. La croix masque l'indication jusqu'à l'étape suivante. */
  let hintOff = null;
  function updHint(startName = null) {
    const where = MOBILE.matches ? "sous la carte" : "à gauche", form = MOBILE.matches ? "le formulaire" : "le formulaire à gauche";
    const dest = rev ? "gare de départ" : "destination", dests = rev ? "gares de départ" : "destinations";
    let k, txt;
    if (!document.body.classList.contains("res")) {
      k = "home" + (startName || "");
      txt = startName ? `Départ : <b>${clean(startName)}</b>. Choisissez la date dans ${form}, puis <b>Afficher les trajets</b>.`
        : `<b>Cliquez sur une gare</b> de la carte pour en faire votre départ (ou choisissez-la dans ${form}), puis <b>Afficher les trajets</b>.`;
    } else if (!routes.length && !selected) { k = "none"; txt = ""; }
    else if (!selected) { k = "res"; txt = `<b>Cliquez sur une ${dest}</b> (point ou nom) sur la carte, ou dans la liste ${where}, pour voir ses trains MAX JEUNE.`; }
    else if (!selTrain && !selBack && $("list").querySelector(".detail .pick")) { k = "one"; txt = `Le seul train possible est affiché avec <b>ses arrêts</b>. <b>Cliquez ailleurs</b> sur la carte pour revenir à toutes les ${dests}.`; }
    else if (selTrain || selBack) { k = "train"; txt = `Train affiché avec <b>ses arrêts</b>. Recliquez sur le train dans la liste pour l'annuler, ou <b>cliquez ailleurs</b> sur la carte pour revenir à toutes les ${dests}.`; }
    else {
      const r = routes.find(r => r.name === selected), many = r && r.vars.length > 1 && effVar() == null;
      k = "sel" + (many ? "m" : "");
      txt = (many ? `Plusieurs itinéraires possibles : <b>cliquez sur un tracé</b> pour n'en garder qu'un, ou ` : "")
        + `<b>${many ? "c" : "C"}liquez sur un train</b> dans la liste ${where} pour voir son tracé et ses arrêts. Cliquez ailleurs sur la carte pour revenir à toutes les ${dests}.`;
    }
    if (k !== hintOff) hintOff = null;
    $("mhint-txt").innerHTML = txt;
    const hide = !txt || hintOff === k;
    if ($("mhint").hidden !== hide || $("mhint").dataset.k !== k) {
      $("mhint").hidden = hide; $("mhint").dataset.k = k;
      $("mhint").classList.remove("pop"); void $("mhint").offsetWidth; $("mhint").classList.add("pop");
    }
  }
  $("mhint-x").onclick = () => { hintOff = $("mhint").dataset.k; $("mhint").hidden = true; };
  function closeDetail() {
    $("list").querySelector(".detail")?.remove();
    selVar = selBackVar = selTrain = trainVar = selBack = null;
    if (nightAuto) setNight(false, true);
    if (selected) { selected = null; applyHighlight(); }
    updHint();
  }
  document.addEventListener("click", e => {
    const a = e.target.closest(".book"); if (!a) return;
    const q = a.dataset.q; if (!q) return;
    navigator.clipboard?.writeText(q).catch(() => { });
    $("status").textContent = `Recherche copiée : « ${q} ». Collez-la dans la recherche de Trainline.`;
  });

  /* Téléphone : la carte est sous le formulaire, on la fait venir à l'écran après une action de l'utilisateur */
  const MOBILE = matchMedia("(max-width: 760px)");
  const toMap = () => MOBILE.matches && $("wrap").scrollIntoView({ behavior: REDUCE ? "auto" : "smooth", block: "start" });
  $("go").onclick = async e => {
    const oIata = $("origin").value, allO = oIata === ALL_O, d0 = $("dest").value, date = $("date").value, ret = $("ret").value;
    /* Toutes les gares de départ : une destination précise est obligatoire */
    if (allO && !d0) {
      $("status").textContent = "Avec « Toutes les gares de départ », choisissez une destination.";
      setTimeout(() => $("dest-btn").click());
      return;
    }
    saveRecent();
    if (e?.isTrusted) toMap();
    $("go").disabled = true; $("status").textContent = "Recherche en cours…";
    try {
      /* Gares voisines de la gare fixe (départ, ou destination en mode « toutes les gares de départ ») : leurs trains sont aussi cherchés,
         avec un changement de gare (métro, RER…) au début du trajet, ou à la fin */
      await garesReady.catch(() => { });
      xferOn = $("xfer").checked;
      HUB_NAMES = allO ? d0.split("|") : catalog().filter(s => oIata.split(",").includes(s.code)).map(s => s.name);
      NEAR_HUB = xferOn ? nearOf(HUB_NAMES) : new Map(); FAR = new Map();
      const nearCodes = [...new Set([...NEAR_HUB.values()].map(x => x.code))].filter(c => !oIata.split(",").includes(c));
      const hubSt = allO ? [d0, ...NEAR_HUB.keys()].join("|") : "";
      const codes = allO ? "" : [...oIata.split(","), ...nearCodes].map(c => `"${esc(c)}"`).join(",");
      const where = allO ? `${F.date}=date'${date}' AND ${whereStation(F.dest, F.destIata, hubSt)}` : `${F.date}=date'${date}' AND ${F.originIata} IN (${codes})`;
      /* Retour : trains qui reviennent vers la gare de départ (ou qui repartent de la destination fixe en mode « toutes les gares ») */
      const whereBack = !ret ? null : allO ? `${F.date}=date'${ret}' AND ${whereStation(F.origin, F.originIata, hubSt)}` : `${F.date}=date'${ret}' AND ${F.destIata} IN (${codes})`;
      /* Trains d'aujourd'hui déjà partis au lancement de la requête : on ne peut plus les prendre, on les retire */
      const now = new Date(), day = iso(now), hhmm = now.toTimeString().slice(0, 5);
      const notGone = d => r => d !== day || String(r[F.dep] || "").padStart(5, "0") > hhmm;
      /* Correspondances demandées : on charge en plus tous les trains du jour avec des places (aller, et retour si demandé) */
      const corr = +$("corr").value;
      maxWait = corr ? gaugeVal("wait") : Infinity;
      const win = (a, b) => [$(a).value === "" ? 0 : +$(a).value, $(b).value === "" ? Infinity : +$(b).value];
      depWin = win("tmin", "tmax"); retWin = ret ? win("rmin", "rmax") : [0, Infinity];
      maxDur = durVal();
      const [out, bk, dOut, dBk] = await Promise.all([fetchQuery({ where }), whereBack ? fetchQuery({ where: whereBack }) : [],
        corr ? fetchDay(date) : [], corr && ret ? fetchDay(ret) : []]);
      all = out.filter(notGone(date)).filter(r => inWin(r[F.dep]) && durOk(toTrain(r))).filter(xferRowOk(allO, false)); back = bk.filter(notGone(ret)).filter(r => inWin(r[F.dep], retWin) && durOk(toTrain(r))).filter(xferRowOk(allO, true)); rDate = ret || null;
      dayOut = dOut.filter(notGone(date)).map(toTrain); dayBack = dBk.filter(notGone(ret)).map(toTrain); nCorr = corr;
      rev = allO; originIata = oIata; qDate = date;
      dest0 = allO ? $("dest").selectedOptions[0].text : null;   // gare, ou « Ville (toutes les gares) »
      origin = allO ? null : $("origin").selectedOptions[0].text;
      /* Codes de la gare fixe : ceux du départ, ou (mode inversé) ceux des gares de destination choisies */
      if (allO) {
        const ns = new Set([...d0.split("|"), ...NEAR_HUB.keys()]), cs = new Set();
        for (const x of [...dayOut, ...dayBack]) { if (ns.has(x.to)) cs.add(x.dIata); if (ns.has(x.from)) cs.add(x.oIata); }
        for (const r of all) cs.add(r[F.destIata]);
        hubCodes = [...cs];
      } else hubCodes = [...oIata.split(","), ...nearCodes];
      /* Gares atteintes seulement avec correspondance (tous types de trains) */
      const inWinMap = m => [...m].filter(([, its]) => its.some(it => inWin(it.dep) && durOk(it))).map(([n]) => n);
      const viaOnly = !allO && corr ? inWinMap(connections(dayOut, hubCodes, true, corr, "")) : [];
      /* Mode normal : destinations desservies (directes ou avec correspondance) ; la destination déjà choisie est conservée */
      if (!allO) {
        const names = [...new Set([...all.map(r => r[F.dest]), ...viaOnly])];
        if (d0 && !names.includes(d0)) names.push(d0);
        destOptions(names.sort(), d0);
      }
      $("dest").disabled = false;
      const anyConn = corr && (allO ? inWinMap(connections(dayOut, hubCodes, false, corr, "")).length > 0 : viaOnly.length > 0);
      if (!all.length && !anyConn) { clearMap(); $("status").textContent = allO ? "Aucun train trouvé vers cette destination à cette date." : "Aucun train trouvé pour cette date et cette gare."; }
      else render();
      showResults(true);
    } catch (e) { $("status").textContent = e.message; }
    $("go").disabled = false; $("days").classList.remove("busy"); updDays();
  };
  /* Résultats : le formulaire laisse la place à un récapitulatif et à la liste des trains */
  function showResults(on) {
    document.body.classList.toggle("res", on);
    startsOn = !on; refreshStarts();   // gares de départ : uniquement sur la carte d'accueil
    updDays(); updHint();
    $("form").hidden = on; $("recap").hidden = !on;
    if (!on) { $("go").focus(); return; }
    const oText = $("origin").selectedOptions[0]?.text || "", dText = $("dest").selectedOptions[0]?.text || "";
    const from = $("origin").value === ALL_O ? "Toutes les gares de départ" : clean(oText);
    const to = $("dest").value ? clean(dText) : "Toutes les destinations";
    const kind = (kindSet() ? ` · ${kindBoxes().filter(x => x.checked).map(x => x.parentElement.textContent.trim()).join(", ")}` : "")
      + (+$("corr").value ? ` · jusqu'à ${$("corr").value} correspondance${$("corr").value > 1 ? "s" : ""}` : "")
      + (+$("corr").value && gaugeVal("wait") < Infinity ? ` (attente ≤ ${durTxt(gaugeVal("wait"))})` : "")
      + (durVal() < Infinity ? ` · trajet ≤ ${durTxt(durVal())}` : "")
      + ($("xfer").checked ? " · changements de gare autorisés" : "");
    const win = (a, b) => $(a).value === "" && $(b).value === "" ? ""
      : $(b).value === "" ? ` (départ dès ${hhmmOf($(a).value)})` : $(a).value === "" ? ` (départ avant ${hhmmOf($(b).value)})`
      : ` (départ ${hhmmOf($(a).value)}–${hhmmOf($(b).value)})`;
    const dates = $("ret").value ? `Aller ${frDate($("date").value)}${win("tmin", "tmax")} · retour ${frDate($("ret").value)}${win("rmin", "rmax")}` : `${frDate($("date").value)}${win("tmin", "tmax")} · aller simple`;
    $("recap-txt").innerHTML = `<b>${from} → ${to}</b><span>${dates}${kind}</span>`;
  }
  /* Retour à la recherche : on efface les résultats et la carte, mais le formulaire garde les choix de la recherche
     (dates, gare de départ, destination, type de train, trains complets) pour pouvoir la modifier */
  /* Carte et liste vidées des résultats (le départ et le formulaire restent) */
  function clearMap() {
    selected = null; selVar = selBackVar = selTrain = trainVar = selBack = null; backVar = null; routes = []; pathOf = null; popup?.remove(); popup = null;
    routesData = { type: "FeatureCollection", features: [] }; pathData = { type: "FeatureCollection", features: [] };
    map.getSource("routes")?.setData(routesData); map.getSource("path")?.setData(pathData); setStops([]); showXfers([]); setTravelTime([]);
    $("legend").classList.remove("show"); $("list").innerHTML = "";
  }
  function resetAll() {
    all = []; back = []; rDate = null; dayOut = []; dayBack = []; nCorr = 0; hubCodes = []; curG = new Map(); curGB = null; rev = false; dest0 = null; origin = null; originIata = null; qDate = null;
    selected = null; selVar = selBackVar = selTrain = trainVar = selBack = null; backVar = null; routes = []; pathOf = null; popup?.remove(); popup = null;
    routesData = { type: "FeatureCollection", features: [] }; pathData = { type: "FeatureCollection", features: [] };
    map.getSource("routes")?.setData(routesData); map.getSource("path")?.setData(pathData); setStops([]); showXfers([]); setTravelTime([]);
    setOriginMarker(null); $("legend").classList.remove("show");
    $("list").innerHTML = "";
    $("status").textContent = "Choisissez une date et une gare de départ.";
    $("origin").dispatchEvent(new Event("change"));   // reconstruit les destinations (toutes les gares, choix conservé) et met à jour les boutons
    $("dest").dispatchEvent(new Event("change"));
    $("search").classList.remove("open"); $("sq").value = ""; $("sres").innerHTML = "";
    map.flyTo({ center: [2.5, 46.6], zoom: 5 });
  }
  $("back").onclick = () => { resetAll(); showResults(false); };
  /* ---------- Changement de jour, en haut de la carte ----------
     Flèche gauche = jour d'avant, jour affiché au centre, flèche droite = jour d'après (dans les 30 jours ouverts) :
     un clic relance exactement la même recherche ce jour-là. Avec un retour, il est décalé d'autant (même écart aller / retour) ;
     une flèche est grisée si le jour sort de la période (ou si le retour en sortirait). */
  const shortDay = v => cap(fromIso(v).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }));
  const dayLbl = v => { const o = DAYS.find(o => o.k === v); return o?.rel ? o.label : shortDay(v); };
  const shiftIso = (v, n) => iso(addDays(fromIso(v), n));
  const ARR = d => `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d < 0 ? "M7.5 2.5 4 6l3.5 3.5" : "M4.5 2.5 8 6 4.5 9.5"}"/></svg>`;
  function updDays() {
    const el = $("days"), i = DAYS.findIndex(o => o.k === qDate);
    if (!document.body.classList.contains("res") || i < 0) { el.hidden = true; el.innerHTML = ""; return; }
    const gap = rDate ? Math.round((fromIso(rDate) - fromIso(qDate)) / 864e5) : null, last = iso(max);
    const btn = d => {
      const o = DAYS[i + d], k = o?.k, r = k && gap != null ? shiftIso(k, gap) : null, off = !o || (r != null && r > last);
      const tip = !o ? "Hors des 30 jours ouverts" : off ? "Retour hors des 30 jours ouverts" : r ? `Aller ${frDate(k)} · retour ${frDate(r)}` : `Mêmes critères le ${frDate(k)}`;
      const lbl = o ? `<span>${dayLbl(k)}</span>` : "";
      return `<button type="button" class="day arr${d < 0 ? " prev" : " next"}"${k ? ` data-k="${k}"` : ""}${off ? " disabled" : ""} title="${tip}" aria-label="${d < 0 ? "Jour d'avant" : "Jour d'après"}${o ? ` : ${frDate(k)}` : ""}">${d < 0 ? ARR(-1) + lbl : lbl + ARR(1)}</button>`;
    };
    el.innerHTML = `${btn(-1)}<span class="day sel" aria-current="date">${dayLbl(qDate)}</span>${btn(1)}`;
    el.hidden = false;
  }
  $("days").onclick = e => {
    const b = e.target.closest("button.day"); if (!b || b.disabled || !b.dataset.k || $("go").disabled) return;
    const k = b.dataset.k, gap = rDate ? Math.round((fromIso(rDate) - fromIso(qDate)) / 864e5) : null;
    $("days").classList.add("busy"); $("days").querySelector(".sel").textContent = dayLbl(k);   // nouveau jour affiché tout de suite, pendant le chargement
    closeDetail();
    setDate(k); if (gap != null) setDate(shiftIso(k, gap), "ret");
    $("go").onclick();
  };
  /* L'attente maximale n'a de sens qu'avec des correspondances */
  /* ---------- Plages horaires de départ : boutons à petite horloge + cadran (#tp) ----------
     Valeur de chaque champ caché : minutes depuis minuit (« » = sans limite). */
  const TP = { id: "tmin", mode: "h", h: 8, m: 0, drag: false };
  const PAIR = { tmin: "tmax", tmax: "tmin", rmin: "rmax", rmax: "rmin" };
  const TP_SUB = { tmin: "Aller · départ au plus tôt", tmax: "Aller · départ au plus tard", rmin: "Retour · départ au plus tôt", rmax: "Retour · départ au plus tard" };
  const two = n => String(n).padStart(2, "0");
  const hhmmOf = v => `${two(Math.floor(v / 60))}:${two(v % 60)}`;
  const polar = (cx, r, a) => [cx + r * Math.sin(a * Math.PI / 180), cx - r * Math.cos(a * Math.PI / 180)];
  /* Petite horloge dont les aiguilles montrent l'heure choisie (10 h 10 quand le champ est vide) */
  const clockIcon = v => {
    const t = v === "" ? 610 : +v, p = (a, l) => polar(12, l, a).map(n => n.toFixed(2)).join(" ");
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 12L${p((t / 60 % 12) * 30, 4.3)}M12 12L${p((t % 60) * 6, 6.2)}"/></svg>`;
  };
  function setTime(id, v) {
    $(id).value = v === "" ? "" : String(v);
    $(id + "-btn").innerHTML = `${clockIcon($(id).value)}<span>${v === "" ? "--:--" : hhmmOf(+v)}</span>`;
    $(id + "-btn").classList.toggle("empty", v === "");
  }
  function tpDraw() {
    const C = 120, hrs = TP.mode === "h", cur = hrs ? TP.h : TP.m;
    const items = hrs ? Array.from({ length: 24 }, (_, v) => ({ v, r: v < 12 ? 94 : 60, a: (v % 12) * 30, t: v < 12 ? two(v) : String(v), sm: v >= 12 }))
      : Array.from({ length: 12 }, (_, i) => ({ v: i * 5, r: 94, a: i * 30, t: two(i * 5) }));
    const [hx, hy] = hrs ? polar(C, cur < 12 ? 94 : 60, (cur % 12) * 30) : polar(C, 94, cur * 6);
    const ticks = hrs ? "" : Array.from({ length: 60 }, (_, i) => i % 5 ? (([x, y]) => `<circle class="tp-tick" cx="${x}" cy="${y}" r="1.3"/>`)(polar(C, 94, i * 6)) : "").join("");
    $("tp-dial").innerHTML = `<circle class="tp-face" cx="${C}" cy="${C}" r="116"/>${ticks}`
      + `<line class="tp-hand" x1="${C}" y1="${C}" x2="${hx}" y2="${hy}"/><circle class="tp-hub" cx="${C}" cy="${C}" r="4"/><circle class="tp-knob" cx="${hx}" cy="${hy}" r="17"/>`
      + items.map(o => { const [x, y] = polar(C, o.r, o.a); return `<text class="tp-n${o.sm ? " sm" : ""}${o.v === cur ? " on" : ""}" x="${x}" y="${y}" dy=".35em">${o.t}</text>`; }).join("");
    $("tp-dial").setAttribute("aria-valuetext", hrs ? `${TP.h} heures` : `${TP.m} minutes`);
    $("tp-dial").setAttribute("aria-label", hrs ? "Heure (flèches pour changer, Entrée pour valider)" : "Minutes (flèches pour changer, Entrée pour valider)");
    $("tp-h").textContent = two(TP.h); $("tp-m").textContent = two(TP.m);
    $("tp-h").classList.toggle("on", hrs); $("tp-m").classList.toggle("on", !hrs);
  }
  function tpOpen(on, id = TP.id) {
    const pop = $("tp");
    $(TP.id + "-btn").setAttribute("aria-expanded", "false");
    if (!on) { pop.hidden = true; return; }
    dpOpen(false);
    /* Champ vide : on propose 8:00 au plus tôt, et une heure après l'autre borne (ou 20:00) au plus tard */
    const v = $(id).value, other = $(PAIR[id]).value, late = id.endsWith("max");
    const t = v !== "" ? +v : late ? (other !== "" ? Math.min(+other + 60, 23 * 60 + 55) : 20 * 60) : (other !== "" ? Math.max(+other - 60, 0) : 8 * 60);
    Object.assign(TP, { id, mode: "h", h: Math.floor(t / 60), m: t % 60 });
    $("tp-sub").textContent = TP_SUB[id];
    tpDraw();
    const r = $(id + "-btn").getBoundingClientRect(), w = 280;
    pop.style.left = `${Math.max(10, Math.min(r.left, innerWidth - w - 10))}px`; pop.style.top = `${r.bottom + 8}px`; pop.style.width = `${w}px`;
    pop.hidden = false; $(id + "-btn").setAttribute("aria-expanded", "true");
    $("tp-dial").focus();
  }
  function tpCommit(v = TP.h * 60 + TP.m) {
    const id = TP.id, o = PAIR[id], late = id.endsWith("max");
    setTime(id, v);
    /* Bornes incohérentes (fin avant début) : l'autre borne est effacée */
    if (v !== "" && $(o).value !== "" && (late ? +$(o).value > v : +$(o).value < v)) setTime(o, "");
    tpOpen(false); $(id + "-btn").focus();
  }
  function dialPick(e) {
    const r = $("tp-dial").getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 240 - 120, y = (e.clientY - r.top) / r.height * 240 - 120;
    const i = Math.round(((Math.atan2(x, -y) * 180 / Math.PI) + 360) % 360 / 30) % 12;
    if (TP.mode === "h") TP.h = i + (Math.hypot(x, y) < 77 ? 12 : 0); else TP.m = i * 5;
    tpDraw();
  }
  for (const id of Object.keys(PAIR)) {
    setTime(id, "");
    $(id + "-btn").onclick = e => { e.stopPropagation(); tpOpen($("tp").hidden || TP.id !== id, id); };
  }
  const dial = $("tp-dial");
  dial.onpointerdown = e => { e.preventDefault(); dial.focus(); dial.setPointerCapture(e.pointerId); TP.drag = true; dialPick(e); };
  dial.onpointermove = e => { if (TP.drag) dialPick(e); };
  dial.onpointerup = () => { if (!TP.drag) return; TP.drag = false; if (TP.mode === "h") { TP.mode = "m"; tpDraw(); } else tpCommit(); };
  dial.onpointercancel = () => { TP.drag = false; };
  dial.onkeydown = e => {
    const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
    if (d) { e.preventDefault(); if (TP.mode === "h") TP.h = (TP.h + d + 24) % 24; else TP.m = (TP.m + 5 * d + 60) % 60; tpDraw(); }
    else if (e.key === "Enter") { e.preventDefault(); if (TP.mode === "h") { TP.mode = "m"; tpDraw(); } else tpCommit(); }
  };
  $("tp-h").onclick = () => { TP.mode = "h"; tpDraw(); dial.focus(); };
  $("tp-m").onclick = () => { TP.mode = "m"; tpDraw(); dial.focus(); };
  $("tp-ok").onclick = () => tpCommit();
  $("tp-clear").onclick = () => tpCommit("");
  document.addEventListener("click", e => { if (!$("tp").hidden && !e.target.closest("#tp, .tp-btn")) tpOpen(false); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("tp").hidden) { tpOpen(false); $(TP.id + "-btn").focus(); } });
  addEventListener("resize", () => tpOpen(false));
  /* Jauges (durée max. du trajet : 1 h → 20 h ; attente max. en correspondance : 30 min → 6 h) : tout à droite = sans limite.
     --p = part remplie de la jauge ; la pastille à droite affiche la valeur */
  const gaugeVal = id => { const d = $(id); return +d.value >= +d.max ? Infinity : Math.round(+d.value * 60); };
  const durVal = () => gaugeVal("dur");
  const durTxt = m => m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${two(m % 60)}` : ""}`;
  for (const id of ["dur", "wait"]) {
    const d = $(id), sync = () => {
      const v = gaugeVal(id);
      d.style.setProperty("--p", `${(d.value - d.min) / (d.max - d.min) * 100}%`);
      $(id + "-out").textContent = v === Infinity ? "Sans limite" : `≤ ${durTxt(v)}`;
      $(id + "-out").classList.toggle("off", v === Infinity);
      d.setAttribute("aria-valuetext", v === Infinity ? "Sans limite" : `${durTxt(v)} maximum`);
    };
    d.addEventListener("input", sync); sync();
  }
  /* « Plus de filtres » : pastille = nombre de filtres modifiés ; bloc ouvert ou fermé mémorisé dans le navigateur */
  const syncMore = () => {
    const n = [!!kindSet(), $("corr").value !== "0", durVal() < Infinity, +$("corr").value > 0 && gaugeVal("wait") < Infinity, !$("xfer").checked, $("full").checked].filter(Boolean).length;
    $("more-n").hidden = !n; $("more-n").textContent = n;
  };
  for (const id of ["kind", "corr", "dur", "wait", "xfer", "full"]) $(id).addEventListener(id === "dur" || id === "wait" ? "input" : "change", syncMore);
  syncMore();
  try { $("more").open = localStorage.getItem("moreOpen") === "1"; } catch { }
  $("more").addEventListener("toggle", () => { try { localStorage.setItem("moreOpen", $("more").open ? "1" : "0"); } catch { } });
  updHint();
  MOBILE.addEventListener("change", () => updHint());
  const syncWait = () => $("wait-f").hidden = !+$("corr").value;
  $("corr").addEventListener("change", syncWait); syncWait();
  const hasRes = () => all.length || dayOut.length;
  $("full").onchange = () => hasRes() && render();
  /* Types de train changés après la recherche : carte et liste refiltrées, récapitulatif mis à jour */
  $("kind").onchange = () => { if (hasRes()) { render(); showResults(true); } };
  /* Au moins un type de train reste coché */
  $("kind").addEventListener("change", e => { if (!kindBoxes().some(x => x.checked)) e.target.checked = true; }, true);
  /* Changer de destination : simple filtre en mode normal ; nouvelle recherche si toutes les gares de départ sont demandées */
  $("dest").onchange = () => {
    if ($("origin").value === ALL_O) { if ($("dest").value && (all.length || rev)) $("go").click(); }
    else if (hasRes() && !rev) render();
  };
  /* Recherches récentes : les 5 derniers couples départ → destination, gardés dans le navigateur (la date n'est pas gardée :
     elle serait vite passée). Un clic remet départ et destination et relance la recherche à la date choisie. */
  const RECENT_KEY = "recentSearches", RECENT_MAX = 5;
  const loadRecent = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; } };
  const storeRecent = l => { try { localStorage.setItem(RECENT_KEY, JSON.stringify(l)); } catch { } renderRecent(); };
  function saveRecent() {
    const o = $("origin").selectedOptions[0], d = $("dest").selectedOptions[0];
    if (!o) return;
    const r = { o: o.value, ot: o.text, d: $("dest").value, dt: d && $("dest").value ? d.text : "" };
    storeRecent([r, ...loadRecent().filter(x => x.o !== r.o || x.d !== r.d)].slice(0, RECENT_MAX));
  }
  const recentTxt = r => `${r.o === ALL_O ? "Toutes les gares" : clean(r.ot)} → ${r.d ? clean(r.dt) : "Toutes destinations"}`;
  function renderRecent() {
    /* Seules les recherches encore possibles (gares présentes dans le jeu de données) sont proposées */
    const oOk = new Set([...$("origin").options].map(o => o.value)), l = NAMES.length ? loadRecent().filter(r => oOk.has(r.o)) : [];
    $("recent").hidden = !l.length;
    $("recent-list").innerHTML = l.map((r, i) => `<li><button type="button" class="recent-go" data-i="${i}" title="Relancer cette recherche">${attr(recentTxt(r))}</button><button type="button" class="recent-x" data-i="${i}" title="Retirer de l'historique" aria-label="Retirer ${attr(recentTxt(r))} de l'historique">×</button></li>`).join("");
    $("recent-list").dataset.keys = JSON.stringify(l.map(r => [r.o, r.d]));
  }
  $("recent-list").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    const [o, d] = JSON.parse($("recent-list").dataset.keys || "[]")[+b.dataset.i] || [];
    if (o == null) return;
    if (b.classList.contains("recent-x")) { storeRecent(loadRecent().filter(x => x.o !== o || x.d !== d)); return; }
    const oSel = $("origin"); if (![...oSel.options].some(x => x.value === o)) return;
    oSel.value = o; oSel.dispatchEvent(new Event("change"));   // reconstruit la liste des destinations
    destOptions(NAMES, d);   // le bouton du champ se met à jour seul (liste des options observée)
    if (!$("go").disabled) $("go").click();
  });
  /* Inverser départ et destination. « Toutes les gares de départ » ↔ « Toutes les destinations » ;
     « Ville (toutes les gares) » ↔ « Ville (toutes les gares) » ; une gare ↔ la même gare. */
  $("swap").onclick = () => {
    const oSel = $("origin"), oVal = oSel.value, dVal = $("dest").value, oOpts = [...oSel.options];
    const oText = oSel.selectedOptions[0]?.text, dText = $("dest").selectedOptions[0]?.text;
    if (!NAMES.length || (oVal === ALL_O && !dVal)) return;   // rien à inverser (aucune destination choisie)
    let newDest = "";
    if (oVal !== ALL_O) {
      newDest = oVal.includes(",") ? cityGroups(NAMES).find(g => g.label === oText)?.members.join("|") || ""
        : NAMES.includes(oText) ? oText : "";
      if (!newDest) { $("status").textContent = "Cette gare de départ ne peut pas servir de destination."; return; }
    }
    const newOrigin = !dVal ? oOpts.find(o => o.value === ALL_O)
      : oOpts.find(o => o.value !== ALL_O && o.value.includes(",") === dVal.includes("|") && o.text === dText);
    if (!newOrigin) { $("status").textContent = `${clean(dText)} n'est pas une gare de départ du jeu de données MAX JEUNE.`; return; }
    oSel.value = newOrigin.value; oSel.dispatchEvent(new Event("change"));   // reconstruit la liste des destinations
    destOptions(NAMES, newDest);
    /* Des résultats étaient affichés : on relance la recherche dans l'autre sens */
    if (all.length || rev) $("go").click();
  };
  /* Sélecteur de cartes Carte facile : fonds + surcouches. On y ajoute nos deux couches (tronçons, gares)
     sous forme de cartes identiques à celles des surcouches de Carte facile. */
  const RAIL = { lgv: false, gares: false };
  /* Visibilité d'une couche facultative : les gares SNCF sont masquées tant qu'un trajet est sélectionné */
  function railVis(id) { return RAIL[id] && !(id === "gares" && selected) ? "visible" : "none"; }   // masquées par défaut ; activables dans le sélecteur de cartes
  const RAIL_LAYERS = { lgv: ["lgv", "lgv-casing"], gares: ["gares", "gares-tgv", "gares-label"] };
  const svgThumb = body => "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#eef1f4"/>${body}</svg>`);
  const RAIL_CARDS = [
    ["lgv", "Tronçons ferroviaires", svgThumb(`<path d="M-4 52 C 14 44 22 30 34 26 S 56 12 70 6" fill="none" stroke="#fff" stroke-width="7"/><path d="M-4 52 C 14 44 22 30 34 26 S 56 12 70 6" fill="none" stroke="#c0392b" stroke-width="3.5"/><path d="M6 -4 C 14 18 24 30 26 44 S 30 60 34 70" fill="none" stroke="#7f8c8d" stroke-width="2"/><path d="M40 70 C 42 52 50 44 70 40" fill="none" stroke="#7f8c8d" stroke-width="2"/>`)],
    ["gares", "Gares voyageurs", svgThumb(`<circle cx="22" cy="24" r="10" fill="#1f4e8c" opacity=".14"/><circle cx="22" cy="24" r="6" fill="#1f4e8c" stroke="#fff" stroke-width="2.5"/><circle cx="44" cy="40" r="10" fill="#1f4e8c" opacity=".14"/><circle cx="44" cy="40" r="6" fill="#1f4e8c" stroke="#fff" stroke-width="2.5"/><circle cx="16" cy="48" r="3.5" fill="#fff" stroke="#5b7fae" stroke-width="2"/><circle cx="50" cy="14" r="3.5" fill="#fff" stroke="#5b7fae" stroke-width="2"/><circle cx="34" cy="54" r="3.5" fill="#fff" stroke="#5b7fae" stroke-width="2"/>`)]
  ];
  class MapSelectorPlus extends MapSelectorControl {
    onAdd(m) {
      const el = super.onAdd(m);
      const list = this._panel.querySelectorAll(".cartefacile-ctrl-map-selector-card-list")[1];
      const first = list.firstChild;   // nos couches passent avant celles de Carte facile
      for (const [id, title, thumb] of RAIL_CARDS) {
        const card = this._createCard(`rail-${id}`, title, thumb, "overlay", () => {
          RAIL[id] = !RAIL[id];
          card.classList.toggle("active", RAIL[id]); card.setAttribute("aria-checked", String(RAIL[id]));
          RAIL_LAYERS[id].forEach(l => map.getLayer(l) && map.setLayoutProperty(l, "visibility", railVis(id)));
        });
        card.classList.toggle("active", RAIL[id]); card.setAttribute("aria-checked", String(RAIL[id]));
        list.insertBefore(card, first);
      }
      return el;
    }
  }
  map.addControl(new MapSelectorPlus({ styles: ["desaturated", "simple", "aerial"], overlays: ["administrativeBoundaries"] }), "top-right");   // juste sous les boutons de zoom

  /* Loupe : recherche d'une gare de départ */
  const fold = t => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  function pickStation(opt) {
    $("origin").value = opt.value; $("origin").dispatchEvent(new Event("change")); $("sq").value = clean(opt.text); $("sres").innerHTML = "";
    const c = locate(opt.text); if (c) map.flyTo({ center: c, zoom: 7 });
    $("go").click();
  }
  $("sbtn").onclick = () => { $("search").classList.toggle("open"); if ($("search").classList.contains("open")) $("sq").focus(); };
  $("sq").oninput = () => {
    const q = fold($("sq").value.trim());
    const res = q ? [...$("origin").options].filter(o => o.value !== ALL_O && fold(o.text).includes(q)).slice(0, 8) : [];
    $("sres").innerHTML = res.map(o => `<li data-i="${o.value}">${clean(o.text)}</li>`).join("");
  };
  $("sq").onkeydown = e => { if (e.key === "Enter") { const li = $("sres").querySelector("li"); if (li) li.click(); } };
  $("sres").onclick = e => { const li = e.target.closest("li"); if (li) pickStation([...$("origin").options].find(o => o.value === li.dataset.i)); };
  /* Charge le GeoJSON du dossier. En http(s) : fetch du .geojson ; en file:// (fetch interdit par le navigateur) :
     sa copie .js (window.TRACES_GEOJSON), régénérée avec make-traces-js.py si le .geojson change. */
  const loadScript = src => new Promise((ok, ko) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = ko; document.head.append(s); });
  async function loadGeo(url, globalName, build, label) {
    try { const r = await fetch(url); if (!r.ok) throw 0; build(await r.json()); return; } catch { }
    try { await loadScript(url.replace(/\.geojson$/, ".js")); build(window[globalName]); }
    catch { $("status").textContent = `${label} introuvable(s) (${url}).`; }
  }
  const tracesReady = loadGeo(TRACES_URL, "TRACES_GEOJSON", buildGraph, "Tracés ferroviaires");
  const garesReady = loadGeo(GARES_URL, "GARES_GEOJSON", buildGares, "Liste des gares");
  loadOrigins();
})();
