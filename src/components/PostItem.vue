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
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { firestore } from '@/firebaseResources'

// Props: input data from PostFeed.vue
const props = defineProps({
  author: String,
  timestamp: [Object, String, Number],
  content: String,
  postId: String, 
  isLoggedIn: Boolean
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

onMounted(async () => {
  const user = auth.user
  if (!user?.email || !props.postId) return

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

  if (newReportCount >= 3 && postData.status !== 'flagged') {
    updates.status = 'flagged'
  }

  await updateDoc(postRef, updates)
  hasReported.value = true
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
