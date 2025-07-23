import { doc, getDoc, updateDoc } from 'firebase/firestore'
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

export async function updatePostVote(postId, jurorEmail, voteType) {
    const postRef = doc(firestore, 'posts', postId)
    const postSnap = await getDoc(postRef)
    if (!postSnap.exists()) return

    const postData = postSnap.data()
    const votes = postData.votes || []

    // Prevent duplicate voting
    if (votes.some(v => v.juror === jurorEmail)) return

    const updatedVotes = [...votes, {
        juror: jurorEmail,
        vote: voteType,
        timestamp: Date.now()
    }]

    const newStatus = getPostModerationStatus(updatedVotes, postData.jurors?.length || 5)
    console.log("🧠 Determined new status:", newStatus)
    const moderationEntry = {
        decision: newStatus,
        content: postData.content,
        timestamp: Date.now()
    }

    const newModerationHistory = [...(postData.moderationHistory || []), moderationEntry]

    const updates = {
        votes: updatedVotes,
        moderationHistory: newModerationHistory
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

        // Pick 5 new jurors (excluding author and all prior jurors)
        const previousJurors = updatedVotes.map(v => v.juror)
        const excluded = [...previousJurors, authorEmail]

        const newJurors = await getJurorEmails(5, excluded)

        await updateDoc(postRef, {
            votes: [], // clear for revote
            jurors: newJurors,
            revoteOptions: tiedOptions,
            status: 'revote',
            moderationHistory: newModerationHistory,
            revoteRound: true
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

        const shouldStrike =
            newStatus === 'inappropriate' ||
            (newStatus === 'revision' && hasBeenModeratedBefore && previouslyResolved)

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
    const jurorCount = postData.jurors?.length || 5
    const isResolved = ['appropriate', 'revision', 'inappropriate'].includes(newStatus)
    const allVotesIn = updatedVotes.length >= jurorCount

    if (isResolved && allVotesIn) {
    updates.status = newStatus // ✅ CRITICAL — update status field!

    if (newStatus === 'appropriate') {
        updates.reportCount = 0
        updates.jurors = []
        updates.votes = []
        updates.revoteOptions = []
        updates.revoteRound = false
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
