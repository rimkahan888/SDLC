import build from '../../content/stages/build.json'
import deploy from '../../content/stages/deploy.json'
import design from '../../content/stages/design.json'
import maintain from '../../content/stages/maintain.json'
import plan from '../../content/stages/plan.json'
import test from '../../content/stages/test.json'

// Temporary read for the placeholder. The cheatsheet will load stages through
// the API (#10) instead of importing content files.
const stageFiles = [plan, design, build, test, deploy, maintain]

export const stages = stageFiles
  .map((stage) => ({
    id: stage.id,
    order: stage.order,
    name: stage.name,
    oneLiner: stage.oneLiner,
  }))
  .sort((left, right) => left.order - right.order)
