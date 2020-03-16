const readline = require('readline')
const R = require('ramda')

const reader = readline.createInterface({
  input: process.stdin,
})

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

const durationInSeconds = duration => {
  const [m, s] = duration.split(':')
  return Number(m) * 60 + Number(s)
}

const parseSegment = segment => ({
  segment_id: segment.id,
  title: segment.title,
  duration: durationInSeconds(segment.duration),
})

const parseEpisode = episode => ({
  episode_id: episode.id,
  date: getDate(episode),
  duration: durationInSeconds(episode.duration),
  segments: episode.segments.map(parseSegment),
  views: episode.views,
})

reader.on('line', line => {
  const json = JSON.parse(line)
  json.episodes.map(R.pipe(
    parseEpisode,
    JSON.stringify,
    console.log
  ))
})