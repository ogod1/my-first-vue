<template>
  <div class="post-item">
    <div class="post-header">
      <span class="author">@{{ author }}</span>
      <span class="date">{{ formattedDate }}</span>
    </div>
    <div class="post-content">
      {{ content }}
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

// Props: input data from PostFeed.vue
const props = defineProps({
  author: String,
  timestamp: [Object, String, Number],
  content: String,
  postId: String, 
  isLoggedIn: Boolean,
  wasEditted: false
})

const formattedDate = computed(() => {
  if (!props.timestamp) return ''
  let d
  // Firestore Timestamp object
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

const auth = useAuthStore()
const hasReported = ref(false)

async function assignMissingJurorsToOldPosts() {
  const postsSnap = await getDocs(collection(firestore, 'posts'))

  for (const postDoc of postsSnap.docs) {
    const postData = postDoc.data()
    const postRef = doc(firestore, 'posts', postDoc.id)

    const reportCount = postData.reportCount || 0
    const jurors = postData.jurors || []
    const status = postData.status || 'active'

    if (reportCount >= 3 && jurors.length === 0 && status !== 'underReview') {
      const newJurors = await getJurorEmails(5)

      await updateDoc(postRef, {
        jurors: newJurors,
        status: 'underReview'
      })

      console.log(`Patched post ${postDoc.id} with jurors:`, newJurors)
    }
  }

  console.log('Finished patching old posts.')
}

let hasRunJurorPatch = false // just to run once 

onMounted(async () => {
  const user = auth.user
  if (!user?.email || !props.postId) return

  // make sure even old posts have jurors assigned to them if required but only running once 
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

  if (reportedBy.includes(user.email)) return

  const newReportCount = (postData.reportCount || 0) + 1
  const updates = {
    reportCount: newReportCount,
    reportedBy: [...reportedBy, user.email]
  }
  const jurors = postData.jurors || []

  // Assign jurors if threshold reached and not already assigned
  if (newReportCount >= 3 && jurors.length === 0) {
    // Example: assign 5 random jurors (replace with your actual juror selection logic)
    const jurorEmails = await getJurorEmails(5)
    updates.jurors = jurorEmails
    updates.status = 'underReview'
  } else if (newReportCount >= 3 && postData.status !== 'underReview') {
    updates.status = 'underReview'
  }

  await updateDoc(postRef, updates)
  hasReported.value = true
}

// Helper to get juror emails (replace with your actual logic)
async function getJurorEmails(count) {
  const usersSnap = await getDocs(collection(firestore, 'users'))
  const jurors = usersSnap.docs
    .map(doc => doc.data())
    .filter(user => user.isJuror)
    .map(user => user.email)
  // Shuffle and pick 'count' jurors
  for (let i = jurors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[jurors[i], jurors[j]] = [jurors[j], jurors[i]]
  }
  return jurors.slice(0, count)
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
</style>