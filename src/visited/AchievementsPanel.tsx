import { useId } from 'react'
import { CheckIcon, TrophyIcon } from '../icons'
import StatsBox from '../ui/StatsBox'
import { ACHIEVEMENTS, GROUPS, progressOf, type Achievement, type Atlas, type Group, type Progress } from './achievements'

const whole = new Intl.NumberFormat('en-US')

/** "3 of 5", or "12,346 km of 40,075 km" */
const describeProgress = (achievement: Achievement, { have, need }: Progress) => {
  const format = achievement.format ?? ((n: number) => whole.format(n))
  return `${format(have)} of ${format(need)}`
}

/** Every achievement by group, earned ones lit, the rest with how far along they are */
export default function AchievementsPanel({ atlas }: { atlas: Atlas }) {
  const all = ACHIEVEMENTS.map((achievement) => ({ achievement, progress: progressOf(achievement, atlas) }))
  const earned = all.filter((x) => x.progress.done)
  const inGroup = (group: Group) => all.filter((x) => x.achievement.group === group)
  const earnedIn = (group: Group) => inGroup(group).filter((x) => x.progress.done).length

  return (
    <div className="achievements">
      <StatsBox
        label="Your achievements"
        stats={[
          { label: 'Earned', value: earned.length, of: all.length },
          { label: 'Continents', value: earnedIn('Continents'), of: inGroup('Continents').length },
          { label: 'Regions', value: earnedIn('Regions'), of: inGroup('Regions').length },
        ]}
      />
      {GROUPS.map((group) => (
        <AchievementGroup key={group} group={group} items={inGroup(group)} />
      ))}
    </div>
  )
}

function AchievementGroup({ group, items }: { group: Group; items: { achievement: Achievement; progress: Progress }[] }) {
  const id = useId()
  const earned = items.filter((x) => x.progress.done).length
  return (
    <section className="achievement-group" aria-labelledby={id}>
      <h3 id={id}>
        {group} <span className="row-meta">{earned} / {items.length}</span>
      </h3>
      <ul className="achievement-list">
        {items.map(({ achievement, progress }) => (
          <li key={achievement.id} className={`achievement${progress.done ? ' earned' : ''}`}>
            <span className="achievement-badge" aria-hidden="true">
              <TrophyIcon size={18} />
            </span>
            <span className="achievement-text">
              <span className="achievement-title">{achievement.title}</span>
              <span className="achievement-description">{achievement.description}</span>
              {!progress.done && progress.need > 1 && (
                <span className="achievement-progress">
                  <span className="progress small" aria-hidden="true">
                    <span style={{ width: `${(progress.have / progress.need) * 100}%` }} />
                  </span>
                  {describeProgress(achievement, progress)}
                </span>
              )}
            </span>
            {progress.done && (
              <span className="achievement-done" aria-label="Earned">
                <CheckIcon size={16} />
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
