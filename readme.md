# Titres du 19h30

Comment collecter les titres des sujets du journal de la RTS.

## Trouver la requête

En allant sur la [page du journal du jour (le 15 Mars 2020)](https://www.rts.ch/play/tv/emission/19h30?id=6454706), nous observons les requêtes que fait le navigateur (dans firefox `ctrl-shift-k` et l'onglet `network`).

La requête suivante semple intéressante:

[https://www.rts.ch/play/tv/show/6454706/latestEpisodes?maxDate=ALL](https://www.rts.ch/play/tv/show/6454706/latestEpisodes?maxDate=ALL)

En ouvrant l'URL dans un autre onglet du navigateur, nous voyons qu'elle retourne les 10 derniers épisodes du "19h30".

![RTS API latestEpisodes](images/rts_api_latestEpisodes.png)

Et chaque épisode contient une séries de `segments`, les sujets du jour.

![RTS API latestEpisodes segments](images/rts_api_latestEpisodes_segments.png)

Essayons de changer la partie `maxDate`:

[https://www.rts.ch/play/tv/show/6454706/latestEpisodes?maxDate=2020-01-01](https://www.rts.ch/play/tv/show/6454706/latestEpisodes?maxDate=2020-01-01)

Il semble que cette requête nous permet de revenir dans le temps. À chaque `maxDate` nous pouvons obtenir les 10 derniers épisodes du "19h30".

## Télécharger les données

Nous allons utiliser la requête pour chercher les 10 derniers épisodes, puis les 10 derniers épisodes d'il y a 10 jours et ainsi de suite.

### Créer les dates `maxDate`

Pour manipuler les dates, nous allons utiliser la librairies [dayjs](https://github.com/iamkun/dayjs).

```
npm install dayjs --save
```

Une fonction pour trouver la prochaine date. 10 jours avant la précèdante:

```js
const getNextMaxDate = maxDate =>
  (maxDate === 'ALL' ? dayjs() : dayjs(maxDate, 'YYYY-MM-DD'))
    .subtract(10, 'day')
    .format('YYYY-MM-DD')
```

Si `maxDate` est `ALL` (la première requête), nous prenons la date du jour (`dayjs()`). Si `maxDate` est une date au format `YYYY-MM-DD`, nous la passons à `dayjs` (`dayjs(maxDate, 'YYYY-MM-DD')`). Une fois que nous avons la date au format `dayjs`, nous pouvons y soustraire 10 jours (`.subtract(10, 'day')`) et la retourner au format souhaité (`.format('YYYY-MM-DD')`).

### Télécharger les derniers épisodes

Pour télécharger les données, nous utilisons `node-fetch`.

```
npm install node-fetch --save
```

Une fonction qui prends `maxDate`, fait la requête et lis la réponse au format `json`:

```js
const getLatestEpisodes = maxDate =>
  fetch(`https://www.rts.ch/play/tv/show/6454706/latestEpisodes?maxDate=${date}`)
    .then(r => r.json())
```

### Sauver les données

Une fois les données obtenues, nous devont les sauver quelque part. Il est possible que notre scripte retourne une erreur tôt ou tard. Si nous gardons les résultat en mémoire pour créer un fichier à la fin, nous risquons de tout perdre en cas d'erreur. Il vaut mieux sauver les données à chaque fois que nous les obtenons.

Nous allons sauver les données dans un fichier [`ndjson`](http://ndjson.org/), (new line delimited json), c'est à dire un fichier où chaque ligne représente un objet `json`. À chaque fois que nous recevons des données du serveur de la RTS, nous ajouterons une ligne à ce fichier.

Nous utiliserons la librairie `fs`. Celle-ci est déjà installée avec `nodejs`. Nous avons déjà utilisé les fonctions `readFile` et `writeFile` de `fs` pour respectivement lire et écrire un fichier entier. Cette fois nous souhaitons pouvoir ajouter une ligne à la fois à un fichier. Nous utiliserons la fonction [`createWriteStream`](https://nodejs.org/en/knowledge/advanced/streams/how-to-use-fs-create-write-stream/)

```js
const file = fs.createWriteStream('latest.ndjson')

const saveLatest = latest =>
  file.write(`${JSON.stringify(latest)}\n`)
```

`file` est le fichier où nous sauvons les données. Il s'appellera `latest.ndjson`. La fonction `saveLatest` prends un objet json (`latest`) et le converti en chaîne de charactère (`JSON.stringify`) et reviens à la ligne `\n`.

### Une boucle pour répèter l'opération

Nous avons ce qu'il nous faut pour télécharger les données pour unhttps://nodejs.org/en/knowledge/advanced/streams/how-to-use-fs-create-write-stream/e certaine date et pour sauver le résultat. Nous devons maintenant créer une boucle qui répète l'oprération pour chaque nouvelle date.

#### Un example de boucle

Pour illustrer à quoi va ressembler notre boucle:

```js
const loop = (number, callback) => {
  if (number === 10) {
    return callback()
  }
  console.log(number)
  loop(number + 1, callback)
}
```

Dans cet example la fonction `loop` prends deux arguments: `number` (n'importe quel nombre) et `callback` (la fonction à appeller une fois la boucle terminée). Si `number` est égal à 10, nous appellons `callback`. Sinon nous loggons `number` et appellons `loop` à nouveau en incrémentant `number` de 1 (`loop(number + 1, callback)`).

Si nous lançons la boucle avec un `number` de 1:

```js
loop(1, () => console.log('done'))
```

`1` va être loggé, `loop` va être appellé avec `2`, `2` va être loggé, `loop` va être appellé avec `3`... et ainsi de suite jusqu'à ce que `loop` est appellé avec `10`. À ce moment là, la fonction `callback` va être appellée. Dans notre cas, `done` va être loggé puisque notre `callback` est `() => console.log('done')`.

#### La boucle finale

Nous souhaitons continuer jusqu'à l'an 2000 si possible. Une fonction pour décider quand il est temps d'arrêter:

```js
const loopShouldEnd = maxDate => {
  if (maxDate === 'ALL') { return false }
  return dayjs(maxDate, 'YYYY-MM-DD').isBefore('2000-01-01', 'YYYY-MM-DD')
}
```

Si `maxDate` est `ALL` (le premier tour), continuons. Si `maxDate` est avant `2000-01-01` arrêtons, sinon continuons.

La boucle:

```js
const loop = (maxDate, callback) => {
  if (loopShouldEnd(maxDate)) {
    // appeller callback si c'est le moment d'arrêter
    return callback()
  }
  // récupèrer les épisodes
  getLatestEpisodes(maxDate)
    .then(latest => {
      // sauver les épisodes
      saveLatest(latest)
      // si "episodes" est vide arrêter la boucle
      if (R.propOr([], 'episodes', latest).length === 0) {
        return callback()
      }
      // générer la prochaine date
      const nextMaxDate = getNextMaxDate(maxDate)
      // logger pour savoir où nous en sommes
      console.log(nextMaxDate)
      // appeller loop avec la nouvelle date
      // pour être gentil avec la RTS et pour ne pas se faire banir de leur serveur
      // attendons 1 seconde (1000 millisecondes) avant de continuer la boucle
      setTimeout(() => {
        loop(nextMaxDate, callback)
      }, 1000)
    })
    // arrêtre la boucle s'il y a une erreur
    .catch(callback)
}
```

Lancer la boucle avec la première valeur (`ALL`). `callback` est une fonction qui prends un argument `err`. S'il y a une erreur, loggons-la, sinon loggons `done`.

```js
loop('ALL', err => console.log(err || 'done'))
```

Le script entier est `scripts/getLatest.js`, nous pouvons le lancer avec:

```
node scripts/getLatest.js
```

Le serveur de la RTS a répondu avec une erreur autour de noël 2004. Nous n'avons pas pu aller jusqu'à l'an 2000. NOus avons néanmoins 15 ans de titres du 19h30 dans `latest.ndjson`.

### Sortir les épisodes

Chaque ligne de `latest.ndjson` contient 10 épisodes. Nous souhaitons avoir un fichier `ndjson` avec un épisode par ligne.

#### Lire un fichier ligne par ligne

`scripts/getEpisodes.js`

Pour lire le fichier `latest.ndjson`, nous utilisons la librairie [`readline`](https://nodejs.org/api/readline.html#readline_readline_createinterface_options). Comme `fs`, celle-ci vient avec `node`, nous n'avons pas besoin de l'installer.

```js
const reader = readline.createInterface({
  input: process.stdin,
})

reader.on('line', line => {
  console.log(line)
})
```

La constante `reader` est un lecteur ligne par ligne qui prends tout texte venant de la console en entrée. Avec `reader.on` nous pouvons écouter les événements sur le lecteur. Dans ce cas quand une ligne est lue, nous la loggons.

Dans les cours précèdants nous avons pris le texte de la console et l'avons sauver dans un fichier avec `>`. Par exemple pour sauver la requête des derniers épisodes du 19h30.

```
curl https://www.rts.ch/play/tv/show/6454706/latestEpisodes?maxDate=ALL > latest_19h30.json
```

Avec `<` nous pouvons faire l'inverse et passer un fichier à la console.

```
node scripts/getEpisodes < latest.ndjson
```

Le fichier `latest.ndjson` est passé à notre scripte qui le lit ligne par ligne et logg une ligne quand elle est lue.

Chaque ligne est une chaîne de charactère puisque c'est ainsi que nous l'avons sauvée en utilisant `JSON.stringify` plus haut. Nous pouvons convertir une ligne en `json` avec `JSON.parse`.

```js
reader.on('line', line => {
  console.log(JSON.parse(line))
})
```

Nous avons maintenant accès à chaque ligne dans le scripte en tant qu'objet javascript.

Comme nous avons vu en analysant la réponse du serveur de la RTS, les épisodes sont sous la clé `episodes`. Plutôt que logger chaque ligne, nous pouvons logger chaque `episode`.

```js
reader.on('line', line => {
  const json = JSON.parse(line)
  json.episodes.map(episode => console.log(episode))
})
```

Si nous souhaitons sauver les épisodes dans un nouveau fichier, nous pouvons utiliser `>` pour sauver ce qui sort de la console dans un nouveau fichier. Mais avant cela nous devons transformer chaque épisode en chaîne de charactère avec `JSON.stringify`.

```js
reader.on('line', line => {
  const json = JSON.parse(line)
  json.episodes.map(episode => console.log(JSON.stringify(episode)))
})
```

```
node scripts/getEpisodes < latest.ndjson > example_episodes.ndjson
```

`latest.ndjson` est passé au scripte `getEpisodes` qui passe chaque épisode à la console qui à son tour les passe à `example_episodes.ndjson`.

`example_episodes.ndjson` n'est pas le fichier final. Nous allons profiter du fait d'avoir accès aux épisodes pour les transformer. N'en garder que les parties qui nous intéressent.

Pour chaque épisodes nous souhaitons avoir:

* `episode_id` l'identifiant unique de l'épisode
* `date` la date de diffusion au format `YYYY-MM-DD`
* `duration` la durée de l'épisode en secondes
* `views` le nombre de vues
* `segments` les sujets traités. Pour chaque `segment`:
  - `segment_id` l'identifiant unique du `segment`
  - `title` le titre du sujet
  - `duration` la durée du sujet en secondes

Revenons à [https://www.rts.ch/play/tv/show/6454706/latestEpisodes?maxDate=ALL](https://www.rts.ch/play/tv/show/6454706/latestEpisodes?maxDate=ALL) pour voir à quoi resconst parseEpisode = episode => ({
  episode_id: episode.id,
  date: getDate(episode),
  duration: durationInSeconds(episode.duration),
  segments: episode.segments.map(parseSegment),
  views: episode.views,
})semblent les épisodes.

#### La date

Les dates peuvent avoir différents formats:
  - `Hier, 19h30`
  - `samedi, 19h30` (pour la semaine passée)
  - `06.03.2020, 19h30` (pour les épisodes plus anciens)

Les `date`s des derniers jours ne sont pas très utiles en tant que telles mais la clé `imageUrl` semble contenir la date, par example `https://www.rts.ch/2020/03/14/20/34/11165246.image/16x9/`.

```js
const getDateFromImageUrl = imageUrl => {
  const [protocol, x, url, year, month, day] = imageUrl.split('/')
  return `${year}-${month}-${day}`
}

const getDate = ({ date, imageUrl }) => {
  const [day] = date.split(',')
  const [ d, m, y ] = day.split('.')
  if (!d || !m || !y) { return getDateFromImageUrl(imageUrl) }
  return `${y}-${m}-${d}`
}
```

La fonction `getDate` prends un épisode pour argument (avec les clés `date` et `imageUrl`), nous enlevons la partie `, 19h30` en séparant la chaîne de charactères au niveau de la virgule et en en prenant la première partie (`const [day] = date.split(',')`). Nous séparons cette dernière par `.` pour avoir les jours (`d`), mois (`m`) et années (`y`) (`const [ d, m, y ] = day.split('.')`). S'il manque un des trois, nous devons aller chercher la date dans `imageUrl`. Sinon nous retournons la date au format `YYYY-MM-DD`. La fonction `getDateFromImageUrl` récupère la date à partir de `imageUrl` en la séparant par `/`.

#### Les durées

Les durées des `episodes` et `segments` est au format `28:32`.

```js
const durationInSeconds = duration => {
  const [m, s] = duration.split(':')
  return Number(m) * 60 + Number(s)
}
```

`durationInSeconds` transforme la durée du format RTS en secondes.

#### Les `segments`

Pour chaque `segment`, nous allons chercher `segment_id`, `title` et `duration`:

```js
const parseSegment = segment => ({
  segment_id: segment.id,
  title: segment.title,
  duration: durationInSeconds(segment.duration),
})
```

#### Les `episodes`

Pour chaque `episode`, nous prenons `episode_id`, `date`, `duration`, `segments` et `views`:

```js
const parseEpisode = episode => ({
  episode_id: episode.id,
  date: getDate(episode),
  duration: durationInSeconds(episode.duration),
  segments: episode.segments.map(parseSegment),
  views: episode.views,
})
```

#### Lire chaque ligne

```js
reader.on('line', line => {
  const json = JSON.parse(line)
  json.episodes.map(R.pipe(
    parseEpisode,
    JSON.stringify,
    console.log
  ))
})
```

Pour chaque ligne, nous tirons tous les épisodes `json.episodes.map`. Nous transformons chaque épisode avec `parseEpisode`, le convertissons en chaîne de charctères avec `JSON.stringify` et le loggons avec `console.log`. `R.pipe` est la fonction [ramda](https://ramdajs.com/docs/#pipe) qui permet d'appliquer plusieurs fonctions à la suite.

```
npm install ramda --save
```

Sans utiliser `pipe`, nous pourrions écrire cette fonction comme ceci:

```js
reader.on('line', line => {
  const json = JSON.parse(line)
  json.episodes.map(episode =>
    console.log(
      JSON.stringify(
        parseEpisode(episode)
      )
    )
  )
})
```