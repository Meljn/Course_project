function createRandom(seed) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function jitter(value, noise, random) {
  return value + (random() * 2 - 1) * noise;
}

function makeSample(type, noise, random) {
  const x = random() * 2 - 1;
  const y = random() * 2 - 1;
  const nx = jitter(x, noise, random);
  const ny = jitter(y, noise, random);

  if (type === 'linear') {
    const boundary = 0.4 * nx - 0.05;
    return { input: [nx, ny], label: ny > boundary ? 1 : 0 };
  }

  if (type === 'circle') {
    const radius = Math.sqrt(nx * nx + ny * ny);
    return { input: [nx, ny], label: radius > 0.62 ? 1 : 0 };
  }

  return { input: [nx, ny], label: nx * ny < 0 ? 1 : 0 };
}

export function createDataset({
  type = 'xor',
  sampleCount = 240,
  trainRatio = 0.75,
  noise = 0.06,
  seed = 42,
} = {}) {
  const random = createRandom(seed);
  const samples = Array.from({ length: Number(sampleCount) }, () => makeSample(type, Number(noise), random));

  for (let index = samples.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [samples[index], samples[swapIndex]] = [samples[swapIndex], samples[index]];
  }

  const splitIndex = Math.max(1, Math.floor(samples.length * trainRatio));
  const trainSamples = samples.slice(0, splitIndex);
  const testSamples = samples.slice(splitIndex);

  const toTensorArrays = (items) => ({
    inputs: items.map((item) => item.input),
    labels: items.map((item) => [item.label]),
    points: items.map((item) => ({
      x: item.input[0],
      y: item.input[1],
      label: item.label,
    })),
  });

  return {
    type,
    train: toTensorArrays(trainSamples),
    test: toTensorArrays(testSamples),
    all: samples.map((item, index) => ({
      x: item.input[0],
      y: item.input[1],
      label: item.label,
      split: index < splitIndex ? 'train' : 'test',
    })),
  };
}
