export const mockUser = {
  id: 'doc12',
  username: 'doctor12',
  email: 'doc@who.com',
  posts: 3,
  following: 2,
  followers: 5,
  followingIds: ['u1', 'u3'] // <-- add this!
}

export const mockGuest = {
  id: 'guest',
  username: 'guest',
  email: 'hello@gmail.com',
  posts: 0,
  following: 0,
  followers: 0,
  followingIds: ['u1', 'u3'] // <-- add this!
}

// User-specific posts
export const mockUserPosts = [
  { id: 1, author: 'doctor12', content: 'Never be cruel, never be cowardly, and never ever eat pears!', date: '2025-07-08 10:00 AM' },
  { id: 2, author: 'doctor12', content: 'Always try to be nice, but never fail to be kind.', date: '2025-07-08 12:00 PM' }
]

export const mockGuestPosts = []

// Global posts for guests
export const mockGlobalPosts = [
  { id: 101, author: 'outsider1', content: 'Whats happening??', date: '2025-07-07 11:00 AM' },
  { id: 102, author: 'traveler2', content: 'Get Lost.', date: '2025-07-07 1:30 PM' },
  { id: 103, author: 'wanderer3', content: 'Hello!!!', date: '2025-07-07 2:45 PM' }
]

// Suggested users
export const mockSuggestedUsers = [
  { id: 'u1', username: 'cooldev' },
  { id: 'u2', username: 'spacetaco' },
  { id: 'u3', username: 'codequeen' },
  { id: 'u4', username: 'lofiuser' },
  { id: 'u5', username: 'postwizard' }
]
