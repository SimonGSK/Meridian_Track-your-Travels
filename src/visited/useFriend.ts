import { usePersistentState } from '../storage'
import { FRIEND_KEY, isFriendOrNone, type Friend } from './friend'

/** The friend you compare with, saved in this browser until removed */
export function useFriend() {
  const [friend, setFriend] = usePersistentState<Friend | null>(FRIEND_KEY, null, isFriendOrNone)
  return [friend, setFriend] as const
}
