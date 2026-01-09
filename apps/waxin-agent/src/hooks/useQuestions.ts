/**
 * Questions state management hook.
 * Manages the display and handling of agent questions.
 */

import type { UserQuestion, QuestionResponse } from '../types.js'

type QuestionAnswerCallback = (response: QuestionResponse) => void
type QuestionCancelCallback = () => void

interface QuestionsState {
  activeQuestion: UserQuestion | null
  questionIndex: number
  onAnswer: QuestionAnswerCallback | null
  onCancel: QuestionCancelCallback | null
}

let state: QuestionsState = {
  activeQuestion: null,
  questionIndex: 0,
  onAnswer: null,
  onCancel: null
}

let changeListeners: Set<() => void> = new Set()

function notifyChange(): void {
  changeListeners.forEach(listener => listener())
}

/**
 * Show a question modal.
 */
export function showQuestion(
  question: UserQuestion,
  callbacks?: {
    onAnswer?: QuestionAnswerCallback
    onCancel?: QuestionCancelCallback
  }
): void {
  state = {
    activeQuestion: question,
    questionIndex: state.questionIndex + 1,
    onAnswer: callbacks?.onAnswer ?? null,
    onCancel: callbacks?.onCancel ?? null
  }
  notifyChange()
}

/**
 * Get the currently active question.
 */
export function getActiveQuestion(): UserQuestion | null {
  return state.activeQuestion
}

/**
 * Check if there's an active question.
 */
export function hasActiveQuestion(): boolean {
  return state.activeQuestion !== null
}

/**
 * Answer the current question.
 */
export function answerQuestion(selectedOptions: string[]): void {
  if (!state.activeQuestion) return

  const response: QuestionResponse = {
    questionIndex: state.questionIndex,
    selectedOptions
  }

  const callback = state.onAnswer
  state = {
    ...state,
    activeQuestion: null,
    onAnswer: null,
    onCancel: null
  }
  notifyChange()

  if (callback) {
    callback(response)
  }
}

/**
 * Cancel/dismiss the current question.
 */
export function cancelQuestion(): void {
  if (!state.activeQuestion) return

  const callback = state.onCancel
  state = {
    ...state,
    activeQuestion: null,
    onAnswer: null,
    onCancel: null
  }
  notifyChange()

  if (callback) {
    callback()
  }
}

/**
 * Subscribe to question state changes.
 */
export function subscribeToQuestions(listener: () => void): () => void {
  changeListeners.add(listener)
  return () => {
    changeListeners.delete(listener)
  }
}

/**
 * Reset questions state.
 */
export function resetQuestions(): void {
  state = {
    activeQuestion: null,
    questionIndex: 0,
    onAnswer: null,
    onCancel: null
  }
  notifyChange()
}
