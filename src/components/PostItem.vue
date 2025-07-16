<template>
  <div class="post-item">
    <div class="post-header">
      <span class="author">@{{ author }}</span>
      <span class="date">{{ formattedDate }}</span>
    </div>
    <div class="post-content">
      {{ content }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// Props: input data from PostFeed.vue
const props = defineProps({
  author: String,
  timestamp: [Object, String, Number],
  content: String
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
</style>
