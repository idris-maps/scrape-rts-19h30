const readline = require('readline')
const R = require('ramda')

const reader = readline.createInterface({
  input: process.stdin,
})

const result = []

reader.on('line', line => {
  const json = JSON.parse(line)
  // ajouter une ligne à "result" si elle satisfait une condition
  if (/* LA CONDITION */) {
    result.push(json)
  }
})

reader.on('close', () => {
  // utiliser les lignes collectées plus haut
  // préparer les données
  console.log(JSON.stringify( /* VOS_DONNEES */ ))
})