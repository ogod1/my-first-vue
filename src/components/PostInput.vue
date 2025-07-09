<template>
  <div class="post-input">
    <h3>Create a New Post</h3>
    <textarea
      v-model="newPost"
      placeholder="What's on your mind?"
      rows="4"
    ></textarea>
    <button @click="submitPost" :disabled="!newPost.trim()">Post</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// Internal state: what the user types
const newPost = ref('')

// Emit event when user posts
const emit = defineEmits(['post'])

function submitPost() {
  // Emit the content to the parent
  emit('post', newPost.value)

  // Clear the input
  newPost.value = ''
}
</script>

<style scoped>
.post-input {
  border: 2px solid #ccc;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 2rem;
}

textarea {
  width: 100%;
  resize: none;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  font-family: inherit;
  font-size: 1rem;
}

button {
  padding: 0.5rem 1rem;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style>
