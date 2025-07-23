<template>
  <div class="author-review">
    <h1>My Flagged Posts</h1>

    <div v-if="!isLoggedIn">
      <p>Please log in to review your posts.</p>
    </div>

    <div v-else-if="!user || !user.email">
      <p>User info not loaded. Please wait or try logging in again.</p>
    </div>

    <div v-else-if="flaggedPosts.length === 0">
      <p>You have no flagged or pending posts.</p>
    </div>

    <div v-else>
      <div v-for="post in flaggedPosts" :key="post.id" class="post-item">
        <p><strong>Status:</strong> {{ post.status }}</p>
        <p><strong>Original Content:</strong></p>
        <p class="post-content">{{ post.content }}</p>

        <!-- Show edit box if revision -->
        <div v-if="post.status === 'revision'">
          <textarea v-model="editedContent[post.id]" rows="4" cols="50"></textarea>
          <button @click="submitEdit(post)">Submit Edit</button>
        </div>

        <!-- Show message and acknowledge button if appropriate -->
        <div v-else-if="post.status === 'appropriate' && !acknowledgedPosts.has(post.id)">
          <p>Your post was just fine. It will return back to feeds.</p>
          <button @click="acknowledgePost(post.id)">Acknowledge</button>
        </div>

        <!-- Show message and acknowledge button if inappropriate -->
        <div v-else-if="post.status === 'inappropriate' && !acknowledgedPosts.has(post.id)">
          <p>
            Your post was found very inappropriate and will be deleted. If this is your first offense, you will not get a strike.
            Otherwise, you have gained a strike against your account.
          </p>
          <button @click="acknowledgePost(post.id)">Acknowledge</button>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/pinia'
import { firestore } from '@/firebaseResources'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'

const auth = useAuthStore()
const isLoggedIn = computed(() => auth.isLoggedIn)
const user = computed(() => auth.user)
const flaggedPosts = ref([])
const editedContent = ref({})  // Track edited content keyed by post ID

// Track posts author has acknowledged, so they disappear from the list on UI only
const acknowledgedPosts = ref(new Set())

onMounted(async () => {
  if (!user.value?.email) return

  const postsSnap = await getDocs(collection(firestore, 'posts'))

  const allPosts = postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

  flaggedPosts.value = allPosts.filter(
    post =>
      post.author === user.value.email &&
      ['underReview', 'revision', 'appropriate', 'inappropriate'].includes(post.status)
  )

  // Initialize editedContent with current post contents
  flaggedPosts.value.forEach(post => {
    editedContent.value[post.id] = post.content
  })
})

async function submitEdit(post) {
  const newContent = editedContent.value[post.id]
  if (!newContent || newContent.trim() === '') {
    alert('Content cannot be empty.')
    return
  }

  if (newContent.trim() === post.content.trim()) {
    alert('No changes detected.')
    return
  }

  const postRef = doc(firestore, 'posts', post.id)
  const newEntry = {
    decision: 'resubmission',
    content: newContent,
    timestamp: Date.now()
  }
  const moderationHistory = [...(post.moderationHistory || []), newEntry]

  try {
    await updateDoc(postRef, {
      content: newContent,
      status: 'underReview',
      votes: [],
      hidden: false,
      moderationHistory
    })

    alert('Edit submitted! Jurors will re-review your updated post.')

    // Update local state
    post.content = newContent
    post.status = 'underReview'
  } catch (error) {
    console.error('Failed to submit edit:', error)
    alert('Failed to submit edit. Please try again.')
  }
}

function acknowledgePost(postId) {
  acknowledgedPosts.value.add(postId)
  flaggedPosts.value = flaggedPosts.value.filter(post => post.id !== postId)
}
</script>

<style scoped>
.author-review {
  max-width: 800px;
  margin: 2rem auto;
  padding: 1rem;
}

.post-item {
  border: 1px solid #ccc;
  margin-bottom: 1rem;
  padding: 1rem;
  border-radius: 6px;
  background: #f7f7f7;
  color: #333;
}

.post-content {
  white-space: pre-wrap;
  background: #fff;
  padding: 0.5rem;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  color: #333;
}

textarea {
  width: 100%;
  margin-bottom: 0.5rem;
}

button {
  padding: 0.5rem 1rem;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
