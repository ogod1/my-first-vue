<template>
  <div class="juror-review">
    <h1>Jury Duty</h1>

    <div v-if="!isLoggedIn">
      <p>Not signed in yet.</p>
    </div>

    <div v-else-if="!isJuror">
      <p>You are not a juror. Adjust your settings to enable juror access.</p>
    </div>

    <div v-else-if="assignedPosts.length === 0">
      <p>You currently have no posts to review.</p>
    </div>

    <div v-else>
      <div
      class="post-to-review"
      v-for="post in assignedPosts"
      :key="post.id"
      >
        <p><strong>Content:</strong> {{ post.content }}</p>

        <details v-if="post.moderationHistory && post.moderationHistory.length">
          <summary>Moderation History</summary>
          <ul>
            <li v-for="(entry, index) in post.moderationHistory" :key="index">
              <strong>{{ formatTimestamp(entry.timestamp) }}:</strong>
              {{ formatVoteOption(entry.decision) }}
              <br />
              <em>{{ entry.content }}</em>
            </li>
          </ul>
        </details>

        <div class="vote-buttons" v-if="!hasVoted(post)">
          <!-- If post is in revote, show only tied options -->
          <template v-if="post.status === 'revote' && post.revoteOptions">
            <button
              v-for="option in post.revoteOptions"
              :key="option"
              @click="vote(post.id, option)"
            >
              {{ formatVoteOption(option) }}
            </button>
          </template>

          <!-- Otherwise show all options -->
          <template v-else-if="isRestrictedVote(post)">
            <p class="warning-text">Please choose between the two shown options to avoid a tie.</p>
            <button
              v-for="option in getRestrictedOptions(post)"
              :key="option"
              @click="vote(post.id, option)"
            >
              {{ formatVoteOption(option) }}
            </button>
          </template>

          <template v-else>
            <button @click="vote(post.id, 'appropriate')">✅ Appropriate</button>
            <button @click="vote(post.id, 'revision')">✏️ Needs Revision</button>
            <button @click="vote(post.id, 'inappropriate')">🚫 Inappropriate</button>
          </template>

        </div>

        <div v-else class="vote-confirmation">
          <template v-if="isFinalized(post)">
            <em>
              You voted: {{ formatVoteOption(getUserVote(post)) }}.<br />
              Final decision: {{ formatVoteOption(post.status) }}.
            </em>
            <div v-if="!hasAcknowledged(post)">
              <button @click="acknowledgePost(post.id)">
                Acknowledge and Remove Post
              </button>
            </div>
          </template>

          <template v-else>
            <em>You voted: {{ getUserVote(post) }}. Final vote pending.</em>
          </template>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, computed } from 'vue'
  import { useAuthStore } from '@/stores/pinia'
  import { firestore } from '@/firebaseResources'
  import { collection, getDocs, doc, getDoc, updateDoc, arrayUnion, query, where, onSnapshot } from 'firebase/firestore'

  import { updatePostVote } from '@/utils/votingLogic'

  const auth = useAuthStore()
  const isJuror = ref(false)
  const assignedPosts = ref([])
  const assignedPostIds = ref([])
  const isLoggedIn = computed(() => auth.isLoggedIn)
  const user = computed(() => auth.user)
  const acknowledgedPosts = ref(new Set())

  onMounted(() => {
  const currentEmail = auth.user?.email
  if (!currentEmail) return

  getDoc(doc(firestore, 'users', currentEmail)).then(userDoc => {
    if (!userDoc.exists()) return
    const userData = userDoc.data()

    isJuror.value = userData.isJuror === true
    if (!isJuror.value) return

    const postsQuery = query(
      collection(firestore, 'posts'),
      where('jurors', 'array-contains', currentEmail)
    )

    onSnapshot(postsQuery, (snapshot) => {
      assignedPosts.value = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(p => {
          const notAcknowledged = !(p.jurorAcknowledged || []).includes(currentEmail)
          const isRelevantStatus = ['underReview', 'appropriate', 'inappropriate', 'revote'].includes(p.status)
          return notAcknowledged && isRelevantStatus
        })
    })
  })
})


  async function vote(postId, decision) {
    const currentEmail = user.value?.email
    if (!currentEmail) return

    await updatePostVote(postId, currentEmail, decision)

    // Re-fetch this post from Firestore to get updated votes
    const updatedSnap = await getDoc(doc(firestore, 'posts', postId))
    const updatedPost = { id: postId, ...updatedSnap.data() }

    // Update this specific post in the list
    const index = assignedPosts.value.findIndex(p => p.id === postId)
    if (index !== -1) {
      assignedPosts.value[index] = updatedPost
    }
  }

  function hasVoted(post) {
    if (!post?.votes || !user.value?.email) return false
    return post.votes.some(v => v.juror === user.value.email)
  }

  const getUserVote = (post) => {
    const currentEmail = user.value?.email
    if (!currentEmail || !post.votes) return null
    const vote = post.votes.find(v => v.juror === currentEmail)
    return vote?.vote || null
  }

  function formatVoteOption(option) {
    switch (option) {
      case 'appropriate':
        return 'Appropriate'
      case 'revision':
        return 'Needs Revision'
      case 'inappropriate':
        return 'Inappropriate'
      default:
        return option
    }
  }

  function isRestrictedVote(post) {
    if (!post?.jurors || !post?.votes) return false

    const hasThreeJurors = post.jurors.length === 3
    const alreadyVoted = post.votes.length === 2
    const voteSet = new Set(post.votes.map(v => v.vote))

    return hasThreeJurors && alreadyVoted && voteSet.size === 2
  }

  function getRestrictedOptions(post) {
    if (!post?.votes) return []
    const votes = post.votes.map(v => v.vote)
    return Array.from(new Set(votes)) // Only two options, no duplicates
  }

  function isFinalized(post) {
    return post?.votes?.length >= post?.jurors?.length
  }

  function hasAcknowledged(post) {
    return (post.jurorAcknowledged || []).includes(user.value?.email)
  }

  async function acknowledgePost(postId) {
    const currentEmail = user.value?.email
    if (!currentEmail) return

    const postRef = doc(firestore, 'posts', postId)
    await updateDoc(postRef, {
      jurorAcknowledged: arrayUnion(currentEmail)
    })

    // Remove post locally
    assignedPosts.value = assignedPosts.value.filter(p => p.id !== postId)
  }

  function voteDetailsMessage(post) {
    if (!hasVoted(post)) return ''
    if (isFinalized(post)) {
      return `You voted ${formatVoteOption(getUserVote(post))}. Final decision: ${formatVoteOption(post.finalDecision)}`
    } else {
      return `You voted ${formatVoteOption(getUserVote(post))}. Final decision still pending.`
    }
  }
  function formatTimestamp(timestamp) {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleString()
  }
</script>

<style scoped>
  .juror-review {
    max-width: 800px;
    margin: 2rem auto;
    padding: 1rem;
  }

  .post-to-review {
    border: 1px solid #ccc;
    padding: 1rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    background: #f9f9f9;
    color: #333;
  }

  .vote-buttons {
    margin-top: 1rem;
  }

  .vote-buttons button {
    margin-right: 0.5rem;
  }

  .warning-text {
    margin: 0.5rem 0;
    color: #c00;
  }

</style>
