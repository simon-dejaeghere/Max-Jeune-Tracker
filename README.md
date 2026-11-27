# Max Jeune Tracker

Un site pour trouver, **sur une carte**, les trains où il reste des places **MAX JEUNE** (l'abonnement SNCF pour les 16-27 ans).

On choisit une date et une gare de départ : la carte affiche toutes les destinations accessibles avec des places MAX JEUNE ce jour-là, avec le tracé réel des lignes, les horaires et des liens directs pour réserver.

> Site indépendant et non officiel, sans lien avec SNCF Voyageurs ni SNCF Connect. Aucune réservation ni aucun paiement n'a lieu sur le site.

Code écrit à 100 % avec [Claude](https://claude.com/claude-code).

---

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Utilisation](#utilisation)
- [Lancer le site en local](#lancer-le-site-en-local)
- [Structure du projet](#structure-du-projet)
- [Fonctionnement technique](#fonctionnement-technique)
- [Mettre à jour les données](#mettre-à-jour-les-données)
- [Déploiement](#déploiement)
- [Sources des données et licences](#sources-des-données-et-licences)
- [Limites connues](#limites-connues)

---

## Fonctionnalités

### Recherche
- **Date du voyage** sur les 30 prochains jours (calendrier intégré).
- **Date de retour facultative** : une destination n'est alors affichée comme disponible que s'il reste des places MAX JEUNE **à l'aller et au retour**. Pour un aller-retour dans la journée, seules les combinaisons faisables sont gardées (le retour part après l'arrivée de l'aller).
- **Gare de départ** avec recherche intégrée, y compris les entrées « Ville (toutes les gares) » qui regroupent les gares d'une même ville (Paris, Lyon…).
- **Destination** : toutes les destinations, ou une gare précise.
- **Mode inversé « Toutes les gares de départ »** : on choisit une destination et le site affiche toutes les gares d'où l'on peut s'y rendre.
- **Bouton d'inversion** départ ⇄ destination.
- **Filtre par type de train** : TGV INOUI, Intercités (jour), Intercités de nuit. Les cars SNCF du jeu de données (« AUTOCAR SNCF ») sont écartés.
- **Option « Afficher aussi les trains complets »**.
- **Correspondances** : trajets directs uniquement, ou jusqu'à 1 ou 2 correspondances. Chaque train de l'itinéraire doit avoir des places MAX JEUNE, le changement se fait dans la même gare avec au moins 15 minutes (attente maximale réglable de 1 h à 5 h, ou sans limite) ; une correspondance n'est proposée que si elle apporte un horaire que les trajets directs n'offrent pas.
- Les trains du jour déjà partis sont retirés automatiquement.

### Quand partir
- Onglet **« Quand partir »**, à côté de **« Où partir »** : pour un trajet précis (une gare de départ **et** une destination, sans « Toutes les gares de départ » ni « Toutes les destinations »), le site parcourt **les 30 prochains jours** et indique ceux où il reste des places MAX JEUNE.
- Mêmes filtres que « Où partir » (plage horaire, types de train, correspondances, attente max., durée max., changements de gare, trains complets). La date du voyage disparaît. La case **« Montrer aussi les retours »** ajoute le calendrier dans le sens inverse (destination → départ), avec sa propre plage horaire : deux onglets **Aller / Retour** (avec le nombre de jours disponibles) permettent de passer de l'un à l'autre, et la liste des jours suit l'onglet choisi.
- **Pas de carte** : un **calendrier** la remplace, une case par jour colorée selon le nombre de trains disponibles (avec l'heure du premier départ). Un clic sur un jour ouvre la liste de ses trains avec les liens de réservation.
- Dans cette liste, l'**icône de carte** d'un train ouvre une **fenêtre** avec la carte de ce seul trajet, tracé comme dans « Où partir » (tracé réel, arrêts, petit train animé) ; la croix en haut à droite, Échap ou un clic à côté la ferment.
- Données chargées en quelques requêtes pour toute la période (trains directs ; avec des correspondances, trains au départ de la gare, vers la destination, et entre les deux pour 2 correspondances), puis chaque jour est calculé comme une recherche « Où partir ».

### Résultats
- Une fois la recherche lancée, le formulaire laisse la place à un **récapitulatif** et à la **liste des destinations**. Le bouton **« Retour à la recherche »** efface les résultats mais garde les choix de la recherche (dates, gares, type de train) pour pouvoir la modifier.
- Pour chaque destination : nombre et horaires des trains disponibles (aller, et retour si demandé), types de trains.
- **Fiche détaillée** au clic : la liste des trains avec places MAX JEUNE, avec pour chacun un lien vers **SNCF Connect** et vers **Trainline** (la recherche est copiée dans le presse-papiers pour Trainline).

### Carte
- Fonds de carte **IGN** (plan désaturé par défaut, plan simple, photos aériennes), via Carte facile.
- **Tracé ferroviaire réel** de chaque trajet (et non une ligne droite), coloré selon le type de train.
- Trajets avec correspondance tracés **en pointillés**, gare par gare. Une destination accessible par plusieurs itinéraires (direct, via Nancy, via Strasbourg…) les montre **tous** ; dans la fiche détaillée, des boutons (ou un clic sur un tracé) permettent de n'en garder **qu'un** sur la carte et dans la liste des trains. Les gares de correspondance apparaissent quand le trajet est sélectionné.
- **Étiquette** sur chaque gare desservie, avec une **bulle indiquant le nombre de trains disponibles**.
- Au clic sur un trajet : mise en avant du trajet, **coloration selon la vitesse maximale** de chaque tronçon, et petits trains animés, dessinés selon le type de train (rame TGV INOUI Duplex avec motrice à chaque bout, OUIGO, locomotive et voitures Corail Intercités, voitures-couchettes Intercités de nuit) ; avec correspondance, la rame change de dessin à chaque changement de train.
- **Arrêts intermédiaires** d'un train précis : dans la fiche détaillée, un clic sur un train de l'aller (ou un itinéraire avec correspondance) trace son trajet et affiche ses arrêts sur la carte (mini ronds, noms en italique) et sous ses horaires. Ils sont déduits des lignes du jeu de données pour ce numéro de train, chargées à la demande.
- Couches activables dans le sélecteur de cartes : **tronçons ferroviaires** et **gares voyageurs**.
- **Loupe** pour rechercher une gare directement sur la carte et lancer la recherche depuis celle-ci.

### Divers
- **Mode nuit** : interrupteur avec une petite lune en haut du panneau. Le fond de carte IGN est recoloré à la volée en bleu nuit (textes clairs, halos sombres), ainsi que le panneau et les étiquettes. Il s'active tout seul quand on choisit un train de nuit, et se désactive quand on passe à un autre train ou ferme la fiche (sauf s'il a été activé à la main).
- **Responsive** : sur téléphone, la page défile (formulaire, carte, liste) et la carte vient à l'écran après une recherche.
- Aucun cookie, aucun compte, aucune donnée personnelle collectée.

---

## Utilisation

1. Choisir la **date du voyage** (et éventuellement une **date de retour**).
2. Choisir la **gare de départ** (Paris est présélectionnée).
3. Facultatif : une **destination**, un **type de train**, ou l'affichage des trains complets.
4. Cliquer sur **« Afficher les trajets »**.
5. Cliquer sur une destination (dans la liste ou sur la carte) pour voir les trains et les liens de réservation.
6. **« Retour à la recherche »** pour modifier la recherche (les dates et les gares choisies sont gardées).

---

## Lancer le site en local

Le site est entièrement **statique** : un fichier HTML, une feuille de style et des données. Il n'y a ni dépendance à installer ni étape de compilation.

```bash
git clone https://github.com/simon-dejaeghere/Max-Jeune-Tracker.git
cd Max-Jeune-Tracker
python3 -m http.server 8000
```

Puis ouvrir <http://localhost:8000>.

Il est aussi possible d'ouvrir directement `index.html` dans le navigateur (`file://`) : les fichiers `.geojson` ne pouvant pas être lus par `fetch` dans ce cas, le site charge à la place leurs copies `.js` (voir [Mettre à jour les données](#mettre-à-jour-les-données)).

Une connexion Internet est nécessaire : les disponibilités, les fonds de carte et les bibliothèques sont chargés en ligne.

---

## Structure du projet

| Fichier | Rôle |
|---|---|
| `index.html` | La page (structure HTML). |
| `app.js` | Tout le JavaScript (recherche, carte, liste, calendrier, liens de réservation). |
| `style.css` | Mise en forme, y compris la version téléphone (`@media (max-width: 760px)`). |
| `liste-des-gares.geojson` | Gares du réseau SNCF (coordonnées), pour placer les gares sur la carte. |
| `trainnomade-traces-ferroviaires.geojson` | Tracés des lignes ferroviaires avec leur vitesse maximale, pour dessiner les trajets réels. |
| `liste-des-gares.js`, `trainnomade-traces-ferroviaires.js` | Copies des deux GeoJSON sous forme de script, utilisées quand le site est ouvert en `file://`. |
| `make-traces-js.py` | Régénère les copies `.js` à partir des `.geojson`. |

---

## Fonctionnement technique

- **Disponibilités** : interrogées en direct sur l'API du portail open data SNCF, jeu de données [`tgvmax`](https://ressources.data.sncf.com/explore/dataset/tgvmax/) (endpoint `exports/json`). Le champ `od_happy_card` indique s'il reste des places MAX JEUNE.
  Les noms de champs utilisés sont regroupés dans la constante `F` de `app.js`, à ajuster si la SNCF les modifie.
- **Placement des gares** : d'abord par la liste des gares SNCF ; pour les noms introuvables, par le [géocodage de la Géoplateforme IGN](https://geoservices.ign.fr/). Les coordonnées trouvées sont gardées en cache dans le `localStorage` du navigateur (clé `geoGares`).
- **Tracés** : les tronçons de `trainnomade-traces-ferroviaires.geojson` forment un graphe ; le chemin entre deux gares est calculé avec l'algorithme de Dijkstra. Les Intercités (de jour comme de nuit) sont tracés sur les lignes classiques (tronçons à moins de 250 km/h) ; quand une destination est desservie à la fois par des TGV et par des Intercités, chacun a son propre tracé.
- **Carte** : [MapLibre GL JS](https://maplibre.org/) 6 et [Carte facile](https://www.npmjs.com/package/carte-facile) (fonds IGN et sélecteur de cartes), chargés depuis unpkg via une *import map*. Les étiquettes des gares et leurs bulles sont dessinées en canvas puis ajoutées comme images de la carte.
- **Correspondances** : quand elles sont demandées, tous les trains du jour avec des places MAX JEUNE sont chargés en une requête (`od_happy_card="OUI"`, ~1 Mo), puis les itinéraires sont calculés dans le navigateur par couches (1, 2 puis 3 trains) en ne gardant, pour chaque gare, que les itinéraires non dominés (départ plus tard et arrivée plus tôt).
- **Liens de réservation** : SNCF Connect (lien de redirection avec gares, date et heure) et Trainline (identifiants de gares Trainline intégrés dans la constante `TL_IDS`).

---

## Mettre à jour les données

Les disponibilités MAX JEUNE sont lues en direct : **rien à faire** pour elles.

Si l'un des fichiers GeoJSON est remplacé, régénérer ses copies `.js` :

```bash
python3 make-traces-js.py
```

---

## Déploiement

Le site est hébergé sur **GitHub Pages** : il suffit de pousser sur la branche `main` pour le mettre en ligne. Aucune configuration de build n'est nécessaire.

---

## Sources des données et licences

| Donnée | Source | Licence |
|---|---|---|
| Disponibilités MAX JEUNE | SNCF Voyageurs, [portail open data SNCF](https://ressources.data.sncf.com/explore/dataset/tgvmax/) | Licence de l'open data SNCF |
| Liste des gares | SNCF Réseau, [open data SNCF](https://ressources.data.sncf.com/) | Licence de l'open data SNCF |
| Tracés et vitesses des lignes | [Train Nomade](https://trainnomade.fr), d'après © [contributeurs OpenStreetMap](https://www.openstreetmap.org/copyright) et les horaires GTFS de SNCF Voyageurs | [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) |
| Fonds de carte et géocodage | IGN, [Géoplateforme](https://geoservices.ign.fr/), via Carte facile | Licence Ouverte Etalab 2.0 |
| Affichage de la carte | [MapLibre GL JS](https://maplibre.org/) | BSD |

SNCF, SNCF Voyageurs, SNCF Connect, MAX JEUNE, TGV INOUI, OUIGO et Intercités sont des marques déposées de SNCF Voyageurs ou de ses filiales, citées à seule fin d'information. Trainline est une marque de Trainline plc.

---

## Limites connues

- Le jeu de données `tgvmax` est mis à jour plusieurs fois par jour, pas en temps réel : une place affichée peut déjà être épuisée. **Seule la disponibilité affichée sur SNCF Connect au moment de la réservation fait foi.**
- Seuls les trains présents dans ce jeu de données apparaissent : TGV INOUI et Intercités. **Les OUIGO n'y figurent pas** (ni les TER) : une place OUIGO à 0 € visible sur SNCF Connect n'apparaîtra donc pas sur le site.
- Certaines petites gares peuvent ne pas être localisées sur la carte ; elles sont alors signalées dans le message d'état et restent visibles dans la liste.
- Si aucun tracé n'est trouvé entre deux gares, seule la gare est affichée, sans trajet.
