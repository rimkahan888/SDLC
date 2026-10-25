import { ref } from 'vue'

const selectedStageId = ref<string | null>(null)

/** The stage the overview has selected. The detail panel reads this and fills the half-page region. */
export function useStageSelection() {
  function selectStage(id: string | null): void {
    selectedStageId.value = id
  }

  return { selectedStageId, selectStage }
}
