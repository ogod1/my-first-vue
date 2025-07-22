import { doc, updateDoc, arrayUnion } from 'firebase/firestore'
import { firestore } from '@/firebaseResources'

export async function updatePostVote(postId, jurorEmail, voteType) {
    const postRef = doc(firestore, 'posts', postId)
    const postSnap = await getDoc(postRef)

    if (!postSnap.exists()) return

    const postData = postSnap.data()
    const votes = postData.votes || []

    // Prevent duplicate voting
    if (votes.some(vote => vote.juror === jurorEmail)) return

    // Add new vote
    const updatedVotes = [...votes, {
        juror: jurorEmail,
        vote: voteType,
        timestamp: Date.now()
    }]

    // Determine new status
    const newStatus = getPostModerationStatus(updatedVotes)

    await updateDoc(postRef, {
        votes: updatedVotes,
        status: newStatus
    })
}

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

export function getPostModerationStatus(votes) {
    const counts = tallyVotes(votes)

    if ((counts.inappropriate || 0) >= 2) return 'inappropriate'
    if ((counts.revision || 0) >= 2) return 'revision'
    if ((counts.appropriate || 0) >= 2) return 'appropriate'

    return 'pending'
}

