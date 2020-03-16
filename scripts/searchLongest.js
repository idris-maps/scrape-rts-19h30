const readline = require('readline')
const R = require('ramda')

const reader = readline.createInterface({
  input: process.stdin,
})

// une fonction pour ordonner les résultats par durée
const sortByDuration = R.pipe(
  R.sortBy(R.prop('duration')), // équivalent à .sort((a, b) => a.duration > b.duration ? 1 : -1)
  R.reverse // inverser, la ligne au dessus ordonne du plus petit au plus grand
)

let result = []

reader.on('line', line => {
  const json = JSON.parse(line)
  const duration = json.duration
  // jusqu'à ce que nous ayons 10 entrées dans "result"
  if (result.length < 10) {
    // ajouter la ligne et ordonner par durée
    result = sortByDuration([...result, json])
  }
  // les durées dans "result" quand la ligne est lue
  const durations = result.map(R.prop('duration'))
  // la durée la plus basse dans "result"
  const lowestDuration = R.last(durations)
  // si la durée de la ligne lue est au dessus
  if (duration > lowestDuration) {
    // remplacer la dernière par celle-ci
    result = sortByDuration([
      ...R.take(9, result), // take prends les 9 premiers
      json
    ])
  }
})

reader.on('close', () => {
  // quand toutes les lignes ont été lues
  const data = result.map(episode => ({
    // prenons la date de l'épisode
    date: episode.date,
    // la durée dans un format lisible par un humain MM:SS
    duree: `${Math.floor(episode.duration / 60)}:${episode.duration % 60}`,
    // le titre du premier sujet
    premier_titre: R.pipe(R.head, R.prop('title'))(episode.segments),
  }))
  // plutôt qu'écrire un json nous allons créer une liste markdown
  console.log(
    data
      .map(({ date, duree, premier_titre }) => `* ${date} - ${premier_titre} (${duree})`)
      .join('\n')
  )
})