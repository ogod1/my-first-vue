import { doc, getDoc, updateDoc, getDocs, collection, deleteDoc, arrayRemove } from 'firebase/firestore'
import { firestore } from '@/firebaseResources'


// Tally votes
export function tallyVotes(votes) {
    const resultCounts = {
        appropriate: 0,
        revision: 0,
        inappropriate: 0,
    }

    votes.forEach(vote => {
        if (resultCounts[vote.vote] !== undefined) {
            resultCounts[vote.vote]++
        }
    })

    return resultCounts
}

// Determine outcome
export function getPostModerationStatus(votes, jurorsLength = 5) {
    const counts = tallyVotes(votes)
    const totalVotes = counts.appropriate + counts.revision + counts.inappropriate
    const maxVotes = Math.max(counts.appropriate, counts.revision, counts.inappropriate)
    const isTied = Object.values(counts).filter(v => v === maxVotes).length > 1

    if (totalVotes < jurorsLength) return 'underReview'
    if (isTied) return 'revote'

    if (counts.inappropriate === maxVotes) return 'inappropriate'
    if (counts.revision === maxVotes) return 'revision'
    if (counts.appropriate === maxVotes) return 'appropriate'

    return 'underReview'
}   

export async function getJurorEmails(requestedCount, excludeEmails = []) {
  if (!Array.isArray(excludeEmails)) excludeEmails = []

  const usersSnap = await getDocs(collection(firestore, 'users'))
  const jurors = usersSnap.docs
    .map(doc => doc.data())
    .filter(user => user.isJuror)
    .filter(user => !excludeEmails.includes(user.email))
    .map(user => user.email)

  // Shuffle
  for (let i = jurors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[jurors[i], jurors[j]] = [jurors[j], jurors[i]]
  }

  // ✅ Make sure number is odd
  const maxAvailable = jurors.length
  let finalCount = Math.min(requestedCount, maxAvailable)

  if (finalCount % 2 === 0) {
    finalCount-- // drop to nearest odd number
  }

  const selected = jurors.slice(0, finalCount)

  return selected
}

export async function updatePostVote(postId, jurorEmail, voteType) {
    const postRef = doc(firestore, 'posts', postId)
    const postSnap = await getDoc(postRef)
    if (!postSnap.exists()) return

    const postData = postSnap.data()
    const votes = postData.votes || []
    const jurorCount = postData.jurors?.length || 5

    // Prevent duplicate voting
    if (votes.some(v => v.juror === jurorEmail)) return

    const updatedVotes = [...votes, {
        juror: jurorEmail,
        vote: voteType,
        timestamp: Date.now()
    }]

    console.log('Votes count:', updatedVotes.length)
    console.log('Jurors assigned:', jurorCount)
    console.log('Votes by juror:', updatedVotes.map(v => v.juror))
    const newStatus = getPostModerationStatus(updatedVotes, postData.jurors?.length || 5)
    console.log("🧠 Determined new status:", newStatus)
    let newModerationHistory = postData.moderationHistory || []

    const isResolved = ['appropriate', 'revision', 'inappropriate'].includes(newStatus)
    const allVotesIn = updatedVotes.length >= jurorCount

    // Only add to moderationHistory if resolved AND different from the last entry
    if (isResolved && allVotesIn) {
        const lastEntry = newModerationHistory[newModerationHistory.length - 1]

        const isDuplicate =
            lastEntry &&
            lastEntry.decision === newStatus &&
            lastEntry.content === postData.content

        if (!isDuplicate) {
            newModerationHistory = [
                ...newModerationHistory,
                {
                    decision: newStatus,
                    content: postData.content,
                    timestamp: Date.now()
                }
            ]
        }
    }

    const updates = {
        votes: updatedVotes,
        moderationHistory: newModerationHistory,
    }

    // Always assign status explicitly to prevent accidental overwrite
    updates.status = newStatus


    const authorEmail = postData.author

    // ✅ Handle revote logic
    if (newStatus === 'revote') {
        const counts = tallyVotes(updatedVotes)
        const maxCount = Math.max(...Object.values(counts))
        const tiedOptions = Object.entries(counts)
            .filter(([_, count]) => count === maxCount)
            .map(([option]) => option)

        await updateDoc(postRef, {
            votes: [], // clear old votes
            revoteOptions: tiedOptions,
            status: 'revote',
            moderationHistory: newModerationHistory,
            revoteRound: true // optional flag to indicate this is a revote round
        })

        console.warn(`🔁 Revote triggered for post ${postId} with options: ${tiedOptions.join(' & ')}`)
        return
    }


    // ⛔ STRIKE Logic (only when resolved and bad)
    if (updatedVotes.length >= 5 && ['inappropriate', 'revision'].includes(newStatus) && authorEmail) {
        const hasBeenModeratedBefore = (postData.moderationHistory || []).length > 0
        const previouslyResolved = (postData.moderationHistory || []).some(entry =>
            ['appropriate', 'revision'].includes(entry.decision)
        )

        let shouldStrike = false

        if (newStatus === 'inappropriate') {
        shouldStrike = true
        } else if (newStatus === 'revision') {
        const hasBeenModeratedBefore = (postData.moderationHistory || []).length > 0
        const previouslyResolved = (postData.moderationHistory || []).some(entry =>
            ['appropriate', 'revision'].includes(entry.decision)
        )
        if (hasBeenModeratedBefore && previouslyResolved) {
            shouldStrike = true
        }
        }


        if (shouldStrike) {
            const userRef = doc(firestore, 'users', authorEmail)
            const userSnap = await getDoc(userRef)

            if (userSnap.exists()) {
                const userData = userSnap.data()
                const currentStrikes = userData.strikes || 0
                const newStrikeCount = currentStrikes + 1

                const userUpdates = { strikes: newStrikeCount }
                if (newStrikeCount >= 3) userUpdates.locked = true

                await updateDoc(userRef, userUpdates)
                console.warn(`⚠️ Strike issued to ${authorEmail}. Total: ${newStrikeCount}`)
            }
        }
    }

    // Final wrap-up logic if resolved (regardless of vote count)

    if (isResolved && allVotesIn) {
        updates.status = newStatus // ✅ CRITICAL — update status field!

        if (newStatus === 'appropriate') {
            updates.reportCount = 0
            updates.jurors = []
            updates.votes = []
            updates.revoteOptions = []
            updates.revoteRound = false
        } else if (newStatus === 'inappropriate') {
            // Notify jurors and author BEFORE deleting the post
            const notifiedUsers = [...(postData.jurors || []), authorEmail]

            for (const email of notifiedUsers) {
            const userRef = doc(firestore, 'users', email)
            const userSnap = await getDoc(userRef)
            if (userSnap.exists()) {
                const userData = userSnap.data()
                const notifications = userData.notifications || []

                notifications.push({
                    message: `A post you reviewed or authored was deleted due to inappropriate content.`,
                    timestamp: Date.now(),
                    postId // optional: for reference even if deleted
                })

                await updateDoc(userRef, { notifications })
            }
            }
            // Delete post document
            await deleteDoc(postRef)

            // Remove post ID from author's posts array
            const userRef = doc(firestore, 'users', authorEmail)
            await updateDoc(userRef, {
                posts: arrayRemove(postId)
            })

            // Exit early since post no longer exists
            return
        } else {
            updates.hidden = true
            updates.revoteOptions = []
            updates.revoteRound = false
        }
    }


    // 🔒 Save final post update (unless it was already handled in revote)
    if (newStatus !== 'revote') {
        await updateDoc(postRef, updates)
    }

}
