const readline = require('readline')
const R = require('ramda')

const reader = readline.createInterface({
  input: process.stdin,
})

const result = []

reader.on('line', line => {
  const json = JSON.parse(line)
  // prenons le titre en lettres minuscules
  const title = json.title.toLowerCase()
  // si le titre inclus le mot "virus"
  if (title.includes('virus')) {
    // ajouter au résultat final
    result.push(json)
  }
})

reader.on('close', () => {
  // les jours où "virus" a été utilisé
  const uniqDays = R.uniq(result.map(R.prop('date')))
  // pour chaque jour nous calculons la somme des secondes
  const data = uniqDays.map(date => ({
    date,
    seconds: R.sum(
      result
        .filter(R.propEq('date', date))
        .map(R.prop('duration'))
    )
  }))
  console.log(JSON.stringify(data))
})