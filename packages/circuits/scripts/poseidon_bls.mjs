import { readFileSync } from 'fs';
import { ZqField } from 'ffjavascript';

const BLS12_381_R = 52435875175126190479447740508185965837690552500527637822603658699938581184513n;
const F = new ZqField(BLS12_381_R);

const constPath = new URL('../../../node_modules/circomlibjs/src/poseidon_constants_opt.json', import.meta.url);
const constants = JSON.parse(readFileSync(constPath, 'utf8'));

const N_ROUNDS_F = 8;
const N_ROUNDS_P = [56, 57, 56, 60, 60, 63, 64, 63, 60, 66, 60, 65, 70, 60, 64, 68];
const pow5 = a => F.mul(a, F.square(F.square(a, a)));

function unsign(o) {
  if ((typeof o === 'string') && (/^[0-9]+$/.test(o) || /^0x[0-9a-fA-F]+$/.test(o))) return F.e(o);
  if (Array.isArray(o)) return o.map(unsign);
  if (o !== null && typeof o === 'object') {
    const res = {};
    for (const k of Object.keys(o)) res[k] = unsign(o[k]);
    return res;
  }
  return o;
}

const opt = unsign(constants);

export default function poseidon(inputs) {
  const t = inputs.length + 1;
  const nRoundsP = N_ROUNDS_P[t - 2];
  const C = opt.C[t - 2];
  const S = opt.S[t - 2];
  const M = opt.M[t - 2];
  const P = opt.P[t - 2];

  let state = [F.zero, ...inputs.map(a => F.e(a))];
  state = state.map((a, i) => F.add(a, C[i]));

  for (let r = 0; r < N_ROUNDS_F / 2 - 1; r++) {
    state = state.map(a => pow5(a));
    state = state.map((a, i) => F.add(a, C[(r + 1) * t + i]));
    state = state.map((_, i) => state.reduce((acc, a, j) => F.add(acc, F.mul(M[j][i], a)), F.zero));
  }

  state = state.map(a => pow5(a));
  state = state.map((a, i) => F.add(a, C[(N_ROUNDS_F / 2 - 1 + 1) * t + i]));
  state = state.map((_, i) => state.reduce((acc, a, j) => F.add(acc, F.mul(P[j][i], a)), F.zero));

  for (let r = 0; r < nRoundsP; r++) {
    state[0] = pow5(state[0]);
    state[0] = F.add(state[0], C[(N_ROUNDS_F / 2 + 1) * t + r]);
    const s0 = state.reduce((acc, a, j) => F.add(acc, F.mul(S[(t * 2 - 1) * r + j], a)), F.zero);
    for (let k = 1; k < t; k++) state[k] = F.add(state[k], F.mul(state[0], S[(t * 2 - 1) * r + t + k - 1]));
    state[0] = s0;
  }

  for (let r = 0; r < N_ROUNDS_F / 2 - 1; r++) {
    state = state.map(a => pow5(a));
    state = state.map((a, i) => F.add(a, C[(N_ROUNDS_F / 2 + 1) * t + nRoundsP + r * t + i]));
    state = state.map((_, i) => state.reduce((acc, a, j) => F.add(acc, F.mul(M[j][i], a)), F.zero));
  }

  state = state.map(a => pow5(a));
  state = state.map((_, i) => state.reduce((acc, a, j) => F.add(acc, F.mul(M[j][i], a)), F.zero));

  const raw = state[0];
  return raw < 0n ? F.p + raw : raw;
}
