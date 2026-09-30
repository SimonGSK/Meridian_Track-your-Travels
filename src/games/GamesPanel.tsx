import { flagUrl } from '../flags'
import type { CountryFeature } from '../countries'
import CountryInput from './CountryInput'
import CountryShape from './CountryShape'
import {
  DIFFICULTIES,
  GAMES,
  answerMode,
  currentRound,
  type Difficulty,
  type GameId,
  type RoundGameState,
} from './games'
import { missing, type LetterGameState } from './letterGame'
import { bestKey, gameScore, type BestScores, type GameState } from './useGame'

type Props = {
  game: GameState | null
  difficulty: Difficulty
  best: BestScores
  previousBest: number | undefined
  onDifficulty: (difficulty: Difficulty) => void
  onStart: (id: GameId) => void
  onPick: (country: CountryFeature, alias?: string | null) => void
  onNext: () => void
  onQuit: () => void
}

const titleOf = (id: GameId) => GAMES.find((g) => g.id === id)!.title
const difficultyLabel = (d: Difficulty) => DIFFICULTIES.find((x) => x.id === d)!.label
const formatScore = (id: GameId, score: number) => (id === 'letter' ? `${score}%` : `${score} / 10`)

export default function GamesPanel(props: Props) {
  const { game } = props
  if (!game) return <GameList {...props} />
  if (game.finished) return <Results {...props} game={game} />
  return game.kind === 'letter' ? <LetterHunt {...props} game={game} /> : <RoundPlay {...props} game={game} />
}

function GameList({ difficulty, best, onDifficulty, onStart }: Props) {
  return (
    <>
      <fieldset className="difficulty">
        <legend>Difficulty</legend>
        <div className="segmented">
          {DIFFICULTIES.map((d) => (
            <label key={d.id}>
              <input
                type="radio"
                name="difficulty"
                value={d.id}
                checked={d.id === difficulty}
                onChange={() => onDifficulty(d.id)}
              />
              <span>{d.label}</span>
            </label>
          ))}
        </div>
        <p className="muted">{DIFFICULTIES.find((d) => d.id === difficulty)!.description}</p>
      </fieldset>

      <ul className="game-list">
        {GAMES.map((g) => {
          const score = best[bestKey(g.id, difficulty)]
          return (
            <li key={g.id}>
              <button type="button" className="game-card" onClick={() => onStart(g.id)}>
                <strong>{g.title}</strong>
                <span className="muted">{g.description}</span>
                {score !== undefined && <span className="best-score">Best: {formatScore(g.id, score)}</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}

const PROMPTS: Record<RoundGameState['id'], string> = {
  find: 'Find this country on the globe',
  flags: 'Which country has this flag?',
  name: 'Which country is highlighted on the globe?',
  shape: 'Which country has this shape?',
}

function GameHeader({ game }: { game: GameState }) {
  return (
    <p className="game-title">
      {titleOf(game.id)} · {difficultyLabel(game.difficulty)}
    </p>
  )
}

function RoundPlay({ game, onPick, onNext, onQuit }: Props & { game: RoundGameState }) {
  const { target, options } = currentRound(game)
  const { answer } = game
  const isLast = game.index === game.rounds.length - 1
  const mode = answerMode(game.id, game.difficulty)
  const done = game.index + (answer ? 1 : 0)

  const optionState = (option: CountryFeature) => {
    if (!answer) return ''
    if (option === target) return ' correct'
    return option === answer.picked ? ' wrong' : ' dimmed'
  }

  const feedback = () => {
    if (!answer) return ''
    const name = target.properties.name
    if (answer.correct) return answer.alias ? `Correct: ${name} (you wrote ${answer.alias})` : 'Correct!'
    const picked = answer.picked.properties.name
    return mode === 'choices' ? `The answer is ${name}.` : `That's ${picked}. The answer is ${name}.`
  }

  return (
    <div className="game">
      <GameHeader game={game} />
      <div className="game-status">
        <span>
          Round {game.index + 1} of {game.rounds.length}
        </span>
        <span>Score {game.score}</span>
      </div>
      <div
        className="progress"
        role="progressbar"
        aria-label="Game progress"
        aria-valuemin={0}
        aria-valuemax={game.rounds.length}
        aria-valuenow={done}
      >
        <div style={{ width: `${(done / game.rounds.length) * 100}%` }} />
      </div>

      <p className="game-prompt">{PROMPTS[game.id]}</p>
      {game.id === 'find' && <p className="game-target">{target.properties.name}</p>}
      {game.id === 'flags' && <img className="game-flag" src={flagUrl(target)!} alt="The flag to identify" />}
      {game.id === 'shape' && <CountryShape country={target} />}

      {mode === 'choices' && (
        <div className="options">
          {options.map((option) => (
            <button
              key={option.properties.name}
              type="button"
              className={`option${optionState(option)}`}
              disabled={!!answer}
              onClick={() => onPick(option)}
            >
              {option.properties.name}
            </button>
          ))}
        </div>
      )}
      {mode === 'typing' && !answer && <CountryInput key={game.index} onAnswer={onPick} />}

      <p className={`feedback${answer ? (answer.correct ? ' correct' : ' wrong') : ''}`} role="status">
        {feedback()}
      </p>

      {answer && (
        // Focus moves here so Enter continues to the next round
        <button type="button" className="primary-button" onClick={onNext} autoFocus>
          {isLast ? 'See results' : 'Next'}
        </button>
      )}
      <button type="button" className="text-button" onClick={onQuit}>
        Quit game
      </button>
    </div>
  )
}

function LetterHunt({ game, onNext, onQuit }: Props & { game: LetterGameState }) {
  const { last } = game
  const lastName = last?.country.properties.name
  const feedback = {
    found: `${lastName} ✓`,
    again: `You already found ${lastName}.`,
    'wrong-letter': `${lastName} doesn't start with ${game.letter}.`,
    territory: `${lastName} is a territory, not a country.`,
  }

  return (
    <div className="game">
      <GameHeader game={game} />
      <p className="game-prompt">Click every country starting with</p>
      <p className="game-letter" aria-label={`the letter ${game.letter}`}>
        {game.letter}
      </p>
      <div className="game-status">
        <span>
          Found {game.found.length} of {game.targets.length}
        </span>
        <span>
          {game.mistakes} {game.mistakes === 1 ? 'mistake' : 'mistakes'}
        </span>
      </div>
      <div
        className="progress"
        role="progressbar"
        aria-label="Countries found"
        aria-valuemin={0}
        aria-valuemax={game.targets.length}
        aria-valuenow={game.found.length}
      >
        <div style={{ width: `${(game.found.length / game.targets.length) * 100}%` }} />
      </div>

      <p className={`feedback${last ? (last.result === 'found' ? ' correct' : ' wrong') : ''}`} role="status">
        {last && feedback[last.result]}
      </p>
      {game.found.length > 0 && (
        <ul className="found-list" aria-label="Found">
          {game.found.map((c) => (
            <li key={c.properties.name}>{c.properties.name}</li>
          ))}
        </ul>
      )}

      <button type="button" className="primary-button secondary" onClick={onNext}>
        Give up and show the rest
      </button>
      <button type="button" className="text-button" onClick={onQuit}>
        Quit game
      </button>
    </div>
  )
}

function verdict(share: number) {
  if (share === 1) return 'Perfect! A true geographer.'
  if (share >= 0.7) return 'Great job!'
  if (share >= 0.4) return 'Not bad. Keep practising!'
  return 'Keep exploring the globe and try again!'
}

function Results({ game, previousBest, onStart, onQuit }: Props & { game: GameState }) {
  const score = gameScore(game)
  const newBest = previousBest !== undefined && score > previousBest
  const share = game.kind === 'letter' ? score / 100 : score / game.rounds.length

  return (
    <div className="game game-results">
      <GameHeader game={game} />
      {game.kind === 'letter' ? (
        <>
          <p className="big-score">
            {game.found.length} / {game.targets.length}
          </p>
          <p>
            countries starting with {game.letter} found, with {game.mistakes}{' '}
            {game.mistakes === 1 ? 'mistake' : 'mistakes'}
          </p>
          {missing(game).length > 0 && (
            <p className="muted">Missed (highlighted on the globe): {missing(game).map((c) => c.properties.name).join(', ')}</p>
          )}
        </>
      ) : (
        <p className="big-score">
          {game.score} / {game.rounds.length}
        </p>
      )}
      <p>{verdict(share)}</p>
      {newBest && <p className="new-best">New best score!</p>}
      <button type="button" className="primary-button" onClick={() => onStart(game.id)}>
        Play again
      </button>
      <button type="button" className="text-button" onClick={onQuit}>
        All games
      </button>
    </div>
  )
}
