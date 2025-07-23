<template>
  <div class="post-item">
    <div class="post-header">
      <span class="author">@{{ author }}</span>
      <span class="date">{{ formattedDate }}</span>
    </div>
    <div class="post-content">
      {{ content }}
    </div>

    <div class="moderation-history" v-if="(isJuror || isAuthor) && moderationHistory.length">
      <h4>Moderation History</h4>
      <ul>
        <li v-for="(entry, index) in moderationHistory" :key="index" class="history-entry">
          <div class="history-meta">
            <strong>{{ new Date(entry.timestamp).toLocaleString() }}</strong> — {{ entry.decision }}
          </div>
          <pre class="history-content">{{ entry.content }}</pre>
        </li>
      </ul>
    </div>

    <!-- Only show report button when logged in -->
    <div class="post-actions" v-if="isLoggedIn">
      <button
        @click="handleReport"
        :disabled="hasReported"   
        class="report-button"
      >
        ⚠️ {{ hasReported ? 'Reported' : 'Report' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/pinia'
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore'
import { firestore } from '@/firebaseResources'
import { getJurorEmails } from '@/utils/votingLogic';

// Props from PostFeed.vue
const props = defineProps({
  author: String,
  timestamp: [Object, String, Number],
  content: String,
  postId: String,
  isLoggedIn: Boolean,
  moderationHistory: {
    type: Array,
    default: () => []
  }
})

const auth = useAuthStore()
const hasReported = ref(false)

const formattedDate = computed(() => {
  if (!props.timestamp) return ''
  let d
  if (typeof props.timestamp === 'object' && props.timestamp.seconds) {
    d = new Date(props.timestamp.seconds * 1000)
  } else if (typeof props.timestamp === 'string' || typeof props.timestamp === 'number') {
    d = new Date(props.timestamp)
  } else if (props.timestamp instanceof Date) {
    d = props.timestamp
  } else {
    return ''
  }
  return d.toLocaleString()
})

onMounted(async () => {
  const user = auth.user
  if (!user?.email || !props.postId) return

  if (!hasRunJurorPatch) {
    await assignMissingJurorsToOldPosts()
    hasRunJurorPatch = true
  }

  const postRef = doc(firestore, 'posts', props.postId)
  const postSnap = await getDoc(postRef)
  const postData = postSnap.data()

  if (postData?.reportedBy?.includes(user.email)) {
    hasReported.value = true
  }
})

async function handleReport() {
  const user = auth.user
  if (!user?.email || !props.postId) return

  const postRef = doc(firestore, 'posts', props.postId)
  const postSnap = await getDoc(postRef)
  if (!postSnap.exists()) return

  const postData = postSnap.data()
  const reportedBy = postData.reportedBy || []
  const jurors = postData.jurors || []
  const newReportCount = (postData.reportCount || 0) + 1

  if (reportedBy.includes(user.email)) return

  // 👇 Updated reported list with current user BEFORE building exclude
  const updatedReportedBy = [...reportedBy, user.email]
  const updates = {
    reportCount: newReportCount,
    reportedBy: updatedReportedBy
  }

  // ✅ Now build exclude AFTER the update
  const exclude = [postData.author, ...updatedReportedBy]

  if (newReportCount >= 3 && jurors.length === 0) {
    let newJurors = await getJurorEmails(5, exclude)

    // Retry until jurors are valid
    let retries = 0
    while (newJurors.some(email => exclude.includes(email)) && retries < 5) {
      console.warn("🚫 Invalid jurors were selected. Retrying...")
      newJurors = await getJurorEmails(5, exclude)
      retries++
    }

    updates.jurors = newJurors
    updates.status = 'underReview'
  } else if (newReportCount >= 3 && postData.status !== 'underReview') {
    updates.status = 'underReview'
  }

  await updateDoc(postRef, updates)
  hasReported.value = true
}


// Only run once per session
let hasRunJurorPatch = false

async function assignMissingJurorsToOldPosts() {
  const postsSnap = await getDocs(collection(firestore, 'posts'))

  for (const postDoc of postsSnap.docs) {
    const postData = postDoc.data()
    const postRef = doc(firestore, 'posts', postDoc.id)

    const reportCount = postData.reportCount || 0
    const jurors = postData.jurors || []
    const status = postData.status || 'active'
    const reportedBy = postData.reportedBy || []
    const exclude = [postData.author, ...reportedBy]

    if (reportCount >= 3 && jurors.length === 0 && status !== 'underReview') {
      let newJurors = await getJurorEmails(5, exclude)

      let retries = 0
      while (newJurors.some(email => exclude.includes(email)) && retries < 5) {
        console.warn("🚫 Invalid jurors were selected during patch. Retrying...")
        newJurors = await getJurorEmails(5, exclude)
        retries++
      }

      await updateDoc(postRef, {
        jurors: newJurors,
        status: 'underReview'
      })

      console.log(`Patched post ${postDoc.id} with jurors:`, newJurors)
    }
  }

  console.log('Finished patching old posts.')
}

</script>

<style scoped>
.post-item {
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
  background-color: white;
}

.post-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: #555;
}

.author {
  font-weight: bold;
  color: #333;
}

.post-content {
  font-size: 1rem;
  line-height: 1.5;
  color: #555;
}

.post-actions {
  margin-top: 0.5rem;
}

.report-button {
  background-color: #ff5c5c;
  color: white;
  border: none;
  padding: 0.3rem 0.7rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.report-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.moderation-history {
  margin-top: 1rem;
  padding-top: 0.5rem;
  border-top: 1px dashed #bbb;
}

.moderation-history h4 {
  margin-bottom: 0.5rem;
  color: #333;
}

.history-entry {
  margin-bottom: 0.75rem;
}

.history-meta {
  font-size: 0.85rem;
  color: #666;
}

.history-content {
  background-color: #f9f9f9;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  white-space: pre-wrap;
  font-size: 0.95rem;
  color: #444;
}

</style>
