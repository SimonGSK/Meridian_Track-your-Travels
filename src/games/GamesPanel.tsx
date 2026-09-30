import { flagUrl } from '../flags'
import type { CountryFeature } from '../countries'
import { GAMES, ROUNDS, currentRound, type GameId, type GameState } from './games'
import type { BestScores } from './useGame'

type Props = {
  game: GameState | null
  best: BestScores
  previousBest: number | undefined
  onStart: (id: GameId) => void
  onPick: (country: CountryFeature) => void
  onNext: () => void
  onQuit: () => void
}

export default function GamesPanel(props: Props) {
  const { game } = props
  if (!game) return <GameList {...props} />
  if (game.finished) return <Results {...props} game={game} />
  return <Playing {...props} game={game} />
}

function GameList({ best, onStart }: Props) {
  return (
    <>
      <p className="muted">Test your geography. Each game has {ROUNDS} rounds.</p>
      <ul className="game-list">
        {GAMES.map((g) => (
          <li key={g.id}>
            <button type="button" className="game-card" onClick={() => onStart(g.id)}>
              <strong>{g.title}</strong>
              <span className="muted">{g.description}</span>
              {best[g.id] !== undefined && (
                <span className="best-score">
                  Best: {best[g.id]} / {ROUNDS}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

const PROMPTS: Record<GameId, string> = {
  find: 'Find this country on the globe',
  flags: 'Which country has this flag?',
  name: 'Which country is highlighted on the globe?',
}

function Playing({ game, onPick, onNext, onQuit }: Props & { game: GameState }) {
  const { target, options } = currentRound(game)
  const { answer } = game
  const isLast = game.index === game.rounds.length - 1
  const title = GAMES.find((g) => g.id === game.id)!.title

  const optionState = (option: CountryFeature) => {
    if (!answer) return ''
    if (option === target) return ' correct'
    return option === answer.picked ? ' wrong' : ' dimmed'
  }

  return (
    <div className="game">
      <p className="game-title">{title}</p>
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
        aria-valuenow={game.index + (answer ? 1 : 0)}
      >
        <div style={{ width: `${((game.index + (answer ? 1 : 0)) / game.rounds.length) * 100}%` }} />
      </div>

      <p className="game-prompt">{PROMPTS[game.id]}</p>
      {game.id === 'find' && <p className="game-target">{target.properties.name}</p>}
      {game.id === 'flags' && <img className="game-flag" src={flagUrl(target)!} alt="The flag to identify" />}

      {options.length > 0 && (
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

      <p className={`feedback${answer ? (answer.correct ? ' correct' : ' wrong') : ''}`} role="status">
        {answer &&
          (answer.correct
            ? 'Correct!'
            : `${game.id === 'find' ? `That's ${answer.picked.properties.name}. ` : ''}The answer is ${target.properties.name}.`)}
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

function verdict(score: number, rounds: number) {
  if (score === rounds) return 'Perfect! A true geographer.'
  if (score >= rounds * 0.7) return 'Great job!'
  if (score >= rounds * 0.4) return 'Not bad. Keep practising!'
  return 'Keep exploring the globe and try again!'
}

function Results({ game, previousBest, onStart, onQuit }: Props & { game: GameState }) {
  const newBest = previousBest !== undefined && game.score > previousBest
  return (
    <div className="game game-results">
      <p className="game-prompt">{GAMES.find((g) => g.id === game.id)!.title}</p>
      <p className="big-score">
        {game.score} / {game.rounds.length}
      </p>
      <p>{verdict(game.score, game.rounds.length)}</p>
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
