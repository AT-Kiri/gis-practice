const DEFAULT_AHP_MATRIX = [
  [1, 2, 3, 4, 5],
  [0.5, 1, 2, 3, 4],
  [0.3333333333, 0.5, 1, 2, 3],
  [0.25, 0.3333333333, 0.5, 1, 2],
  [0.2, 0.25, 0.3333333333, 0.5, 1],
]

export const AHP_CRITERIA = ['rainfall', 'windForce', 'earthquakeIntensity', 'affectedPeople', 'rescueCapacity']
export const AHP_CRITERIA_LABELS = {
  rainfall: '降雨(mm)',
  windForce: '风力(级)',
  earthquakeIntensity: '地震强度',
  affectedPeople: '受灾人数',
  rescueCapacity: '救援能力',
}

function normalizeMatrix(matrix) {
  const size = matrix.length
  const columnSums = Array(size).fill(0)
  const normalized = matrix.map(row => [...row])

  for (let j = 0; j < size; j += 1) {
    for (let i = 0; i < size; i += 1) {
      columnSums[j] += matrix[i][j]
    }
  }

  for (let i = 0; i < size; i += 1) {
    for (let j = 0; j < size; j += 1) {
      normalized[i][j] = matrix[i][j] / columnSums[j]
    }
  }

  return normalized
}

export function calculateAHPWeights(matrix = DEFAULT_AHP_MATRIX) {
  const normalized = normalizeMatrix(matrix)
  const size = normalized.length
  const weights = Array(size).fill(0)

  for (let i = 0; i < size; i += 1) {
    let sum = 0
    for (let j = 0; j < size; j += 1) {
      sum += normalized[i][j]
    }
    weights[i] = sum / size
  }

  const total = weights.reduce((sum, value) => sum + value, 0)
  return weights.map(value => value / total)
}

export function normalizeCriterionValue(key, value) {
  const bounds = {
    rainfall: [0, 180],
    windForce: [2, 14],
    earthquakeIntensity: [0, 6.5],
    affectedPeople: [0, 8000],
    rescueCapacity: [0, 200],
  }
  const [min, max] = bounds[key] || [0, 1]
  if (max === min) return 0.5
  if (value <= 1 && max > 1) return Math.min(1, Math.max(0, value))
  const normalized = (value - min) / (max - min)
  return Math.min(1, Math.max(0, normalized))
}

function minMaxNormalize(value, min, max) {
  if (max === min) return 0.5
  if (value <= 1 && max > 1) return Math.min(1, Math.max(0, value))
  const normalized = (value - min) / (max - min)
  return Math.min(1, Math.max(0, normalized))
}

export function computeCompositeScore(values, weights = calculateAHPWeights()) {
  const normalizedValues = {
    rainfall: minMaxNormalize(values.rainfall, 0, 180),
    windForce: minMaxNormalize(values.windForce, 2, 14),
    earthquakeIntensity: minMaxNormalize(values.earthquakeIntensity, 0, 6.5),
    affectedPeople: minMaxNormalize(values.affectedPeople, 0, 8000),
    rescueCapacity: 1 - minMaxNormalize(values.rescueCapacity, 0, 200),
  }

  let score = 0
  AHP_CRITERIA.forEach((key, index) => {
    score += normalizedValues[key] * weights[index]
  })

  return Number(score.toFixed(4))
}

export function scoreToRiskLevel(score) {
  if (score >= 0.75) return '极高'
  if (score >= 0.55) return '高'
  if (score >= 0.35) return '中'
  if (score >= 0.2) return '较低'
  return '低'
}

export function buildAHPRiskMetrics(item) {
  const score = computeCompositeScore(
    {
      rainfall: item.rainfall || 0,
      windForce: item.windForce || 0,
      earthquakeIntensity: item.earthquakeIntensity || 0,
      affectedPeople: item.affectedPeople || 0,
      rescueCapacity: item.rescueCapacity || 0,
    },
  )

  return {
    ahpScore: score,
    ahpRiskLevel: scoreToRiskLevel(score),
  }
}
